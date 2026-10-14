/* Run the same production-script fixture in the requested browser engines. */
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const names=process.argv.slice(2);
const browsers=names.length?names:['chromium','firefox','webkit'];
for(const name of browsers){
  if(!['chromium','firefox','webkit'].includes(name))throw Error('Unknown browser engine: '+name);
  const result=spawnSync(process.execPath,['--test',path.join(__dirname,'../tests/native-browser.test.cjs')],{
    stdio:'inherit',env:{...process.env,TEST_BROWSER:name}
  });
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status || 1);
}
