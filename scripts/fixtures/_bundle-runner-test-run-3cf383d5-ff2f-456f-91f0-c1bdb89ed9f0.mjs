import { runBundle } from '../_bundle-runner.mjs';
await runBundle('test', [{"label":"FAIL","script":"fixtures/_bundle-fixture-fail.mjs","intervalMs":1,"timeoutMs":5000}], {});
