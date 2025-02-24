const $gettext = (s: string) => s
import JSZip from 'jszip'

export async function unzip (file: File) {
  // unzip a file and return a json (solo json zipped)
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  const tfile = zip.file(filesNames[0])
  if (tfile) {
    const str = await tfile.async('string')
    const content = JSON.parse(str)
    return content
  }
  return {}
}

function checkPaths (paths: string[]) {
  // check that the zip files contains with inputs/ or outputs/ (as root folders.)
  const test = paths.filter(path => path.startsWith('inputs/') || path.startsWith('outputs/'))
  if (test.length === 0) {
    const err = new Error($gettext(' root folders should be inputs/ and outputs/. not: ') + paths[0])
    err.name = 'ImportError'
    throw err
  }
}

export async function extractZip (file: File) {
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  let filesNames = Object.keys(zip.files)
  filesNames = filesNames.filter(name => !name.match(/^__MACOSX\//))
  filesNames = filesNames.filter(name => !name.endsWith('/'))
  checkPaths(filesNames)
  // process ZIP file content here
  const result = []
  for (const fileName of filesNames) {
    const file = zip.file(fileName)
    if (file) {
      const str = await file.async('string')
      let content = {}
      if (fileName.endsWith('.json') || fileName.endsWith('.geojson')) {
        try {
          content = JSON.parse(str.trim())
        } catch (err: any) {
          err.name = 'ImportError in ' + fileName
          if (str.length === 0) { err.message = 'file is empty' }
          throw err
        }
      } else {
        content = await file.async('uint8array')
      }
      // import with new fileStructure (inputs, outputs folder in zip)

      result.push({ path: fileName, content })
    }
  }

  return result
}

export async function unzipCalendar (file: File) {
  // unzip a file and return a json (solo json zipped)
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  if (filesNames.includes('calendar.txt')) {
    const tfile = zip.file('calendar.txt')
    if (tfile) {
      const bytes = await tfile.async('uint8array')
      const content = csvJSON(bytes)
      return content
    }
  }

  return {}
}

// https://stackoverflow.com/questions/27979002/convert-csv-data-into-json-format-using-javascript
export function csvJSON(bytes: Uint8Array, quoteChar = '"', delimiter = ',') {
  // this version will read columns with lists.
  const text = new TextDecoder().decode(bytes)
  var rows = text.split('\n')
  var headers = rows[0].split(',')

  const regex = new RegExp(`\\s*(${quoteChar})?(.*?)\\1\\s*(?:${delimiter}|$)`, 'gs')

  const match = (line: any) => [...line.matchAll(regex)]
    .map(m => m[2])
    .slice(0, -1)

  var lines = text.split('\n')
  const heads = headers ?? match(lines.shift())
  lines = lines.slice(1)

  return lines.map(line => {
    return match(line).reduce((acc, cur, i) => {
      // replace blank matches with `null`
      const val = cur.length <= 0 ? null : Number(cur) || cur
      const key = heads[i] ?? `{i}`
      return { ...acc, [key]: val }
    }, {})
  })
}

export function readFileAsText (file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function (event) {
      resolve(event?.target?.result)
    }
    reader.onerror = function (event) {
      reject(event?.target?.error)
    }
    reader.readAsText(file)
  })
}

export function readFileAsBytes (file: any) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function (event: any) {
      const fileBytes = new Uint8Array(event.target.result)
      resolve(fileBytes)
    }
    reader.onerror = function (event: any) {
      reject(event.target.error)
    }
    reader.readAsArrayBuffer(file)
  })
}
