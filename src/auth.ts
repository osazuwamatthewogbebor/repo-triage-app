import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { CONFIG } from "./config.js";

const CONFIG_DIR = path.join(os.homedir(), ".config", "github-triage-agent");
const TOKEN_PATH = path.join(CONFIG_DIR, "credentials.json");

interface StoredCredentials {
    access_token: string;
    obtained_at: string;
}

interface DeviceCodeResponse {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    expires_in: number;
    interval: number;
}

interface DeviceCodeErrorResponse {
    error: string;
    error_description?: string;
    error_uri?: string;
}

interface AccessTokenSuccess {
    access_token: string;
    token_type: string;
    scope: string;
}

interface AccessTokenError {
    error:
    | "authorization_pending"
    | "slow_down"
    | "expired_token"
    | "access_denied"
    | "incorrect_device_code"
    | "unsupported_grant_type"
    | "incorrect_client_credentials";
    error_description?: string;
    error_uri?: string;
    /** RFC 8628 allows the server to send a new interval with `slow_down`. */
    interval?: number;
}

// Get github token from if it wxists
function readCachedToken(): string | null {
    try {
        const raw = fs.readFileSync(TOKEN_PATH, "utf-8");
        return (JSON.parse(raw) as StoredCredentials).access_token ?? null;
    } catch (error) {
        return null;
    }
}

// Write token to cache
function writeCachedToken(token: string): void {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });

    const data: StoredCredentials = { access_token: token, obtained_at: new Date().toISOString() };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2), { mode: 0o600 });
};

// Request deviceCode from github API
async function requestDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
    const res = await fetch("https://github.com/login/device/code", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, scope: "public_repo" }),
    });

    const data = (await res.json()) as DeviceCodeResponse | DeviceCodeErrorResponse;
    if ("error" in data || !res.ok) {
        const detail = "error" in data ? (data.error_description ?? data.error) : res.statusText;
        throw new Error(`Github device flow request failed: ${detail}`);
    }

    return data
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


async function pollForToken(
    clientId: string,
    deviceCode: string,
    intervalSeconds: number,
    expiresIn: number
): Promise<string> {
    const deadline = Date.now() + expiresIn * 1000;
    let interval = intervalSeconds

    while (Date.now() < deadline) {
        await sleep(interval * 1000);

        const res = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: clientId,
                device_code: deviceCode,
                grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            }),
        });

        const data = (await res.json()) as AccessTokenSuccess | AccessTokenError;

        if ("access_token" in data) return data.access_token;
        if (data.error === "authorization_pending") continue;
        if (data.error === "slow_down") {
            interval += 5;
            continue;
        }
        if (data.error === "expired_token") throw new Error("The device login code expired. Please run again.");
        if (data.error === "access_denied") throw new Error("GitHub login was denied by the user.");
        throw new Error(`Unexpected device flow response: ${JSON.stringify(data)}`);
    }
    throw new Error("Timed out waiting for GitHub authentication approval.");
}


export async function getGithubToken(): Promise<string> {
    if (CONFIG.github.token) return CONFIG.github.token;

    const cached = readCachedToken();
    if (cached) return cached;

    const clientId = CONFIG.github.clientId;
    if (!clientId) {
        throw new Error(
            "No GitHub access token available. Set GITHUB_TOKEN or set GITHUB_CLIENT_ID to run OAuth device login."
        );
    }

    const {
        device_code,
        user_code,
        verification_uri,
        verification_uri_complete,
        expires_in,
        interval
    } = await requestDeviceCode(clientId);

    console.log(`\nAuthorization needed for Github.`);
    console.log(`1. Visit: ${verification_uri}`)
    console.log(`2. Enter code: ${user_code}`)
    console.log(`OR. Visit: ${verification_uri_complete}`)
    console.log("Waiting for approval...");

    const token = await pollForToken(clientId, device_code, interval, expires_in);
    writeCachedToken(token);

    console.log("GitHub access authorized and saved to credentials store.\n");
    return token;
}