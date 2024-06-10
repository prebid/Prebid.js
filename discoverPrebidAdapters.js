const pathModule = require('path')
const { readdirSync, unlinkSync, writeFileSync } = require('fs')
const { runKarma } = require('./gulpfile.js');
const autoReportTestPath = './test/spec/autoreport_spec.js'

function generateTestCode() {
  const moduleDirPath = 'modules/';
  const bidFileTestRegex = /^.*BidAdapter\.js$/;
  const filesArray = readdirSync(moduleDirPath);
  const bidAdapterFiles = filesArray.filter(file => bidFileTestRegex.test(file))
  const logsBlocks = []
  const imports = bidAdapterFiles.map((file) => {
    const path = pathModule.join(moduleDirPath, file);
    const varName = '_' + file.replace('.', '').replace(/-/g, '_');

    logsBlocks.push(`
  try{
     console.log('codes', '${path}',${varName}.spec.code,JSON.stringify(${varName}.spec.aliases));
  }catch(e){
     console.log('fail', '${path}','${varName}',e.message);
  }
  `)
    return `import * as ${varName} from '${path}';`
  })

  let code = imports.join('\n') + '\n';

  const testBody = `
describe.only('Gather bidAdapters', () => {
  it('should log results', () => {
    ${logsBlocks.join('\n')}
  });
})
`
  return code + testBody;
}

function runAndScrapeKarmaLogs(cb) {

  const allLogsArray = []


  function onEnd(result) {
    cb && cb(result)

  }

  function onKarmaDone() {
    function clean(strPart) {
      return strPart.slice(1, -1);
    }

    const result = allLogsArray.join('')
      .split('\n')
      .filter(str => str.startsWith(`LOG: 'codes'`))
      .reduce((acc, item) => {
        const strParts = item.split(', ')
        acc[clean(strParts[1])] = {
          code: eval(strParts[2]),
          aliases: JSON.parse(eval(strParts[3]) || '[]'),
        }
        return acc;
      }, {})

    onEnd(result);
  }

  const child = runKarma({
    silent: true,
    file: autoReportTestPath
  }, onKarmaDone);

  child.stdout.on('data', (data) => {
    allLogsArray.push(data.toString())
  })

}

function run(){
  writeFileSync(autoReportTestPath, generateTestCode())
  runAndScrapeKarmaLogs((result) => {
    writeFileSync('./report-sample.json', JSON.stringify(result))
    unlinkSync(autoReportTestPath)
  });
}

run();
