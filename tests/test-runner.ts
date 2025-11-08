// ===== tests/test-runner.ts - Manual Test Runner =====
import chalk from 'chalk';

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    duration: number;
}

class TestRunner {
    private results: TestResult[] = [];

    async runTest(name: string, testFn: () => Promise<void> | void): Promise<void> {
        const startTime = Date.now();
        
        try {
            await testFn();
            const duration = Date.now() - startTime;
            this.results.push({ name, passed: true, duration });
            console.log(chalk.green('✓'), name);
        } catch (error: any) {
            const duration = Date.now() - startTime;
            this.results.push({ name, passed: false, error: error.message, duration });
            console.error(chalk.red('✗'), name);
            console.error(chalk.red(error.stack));
        }
    }

    summarize(): void {
        const passedCount = this.results.filter(r => r.passed).length;
        const failedCount = this.results.length - passedCount;
        const totalDuration = this.results.reduce((acc, r) => acc + r.duration, 0);

        console.log('\n' + chalk.bold('Test Summary'));
        console.log(chalk.green(`Passed: ${passedCount}`));
        console.log(chalk.red(`Failed: ${failedCount}`));
        console.log(`Total Duration: ${totalDuration}ms`);

        if (failedCount > 0) {
            process.exit(1); // Exit with error code if tests failed
        }
    }
}

// Example of how to use the runner
async function main() {
    const runner = new TestRunner();

    await runner.runTest('Example Success Test', () => {
        if (1 + 1 !== 2) {
            throw new Error('Math is broken!');
        }
    });

    await runner.runTest('Example Failure Test', () => {
        throw new Error('This test was designed to fail.');
    });

    runner.summarize();
}

main();
