# repo-triage-app

### How to Run

#### Check Queue Status:
    
```Bash
    npm run dev -- status
```
    
#### Discover Repos and Issues (Stage 1):

```Bash
    npm run dev -- discover "topic:express language:typescript"
```
    
#### Process Next Queued Item (Stage 2 -> Web Search -> Discord):

```Bash
    npm run dev -- process
```

#### Run End-to-End Pipeline:
    
```Bash
    npm run dev -- run-all "topic:cli language:typescript"
```