const port = process.env.PORT || 3000;

async function checkHealth() {
    const response = await fetch(
        `http://127.0.0.1:${port}/health`, {
            signal: AbortSignal.timeout(4000)
        }
    );

    if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'ok' || data.mongodb !== 'connected') {
        throw new Error('API hoac MongoDB chua san sang');
    }

    console.log('Healthcheck OK');
}

checkHealth()
    .then(() => {
        process.exit(0);
    })
    .catch(err => {
        console.error(`Healthcheck FAILED: ${err.message}`);
        process.exit(1);
    });