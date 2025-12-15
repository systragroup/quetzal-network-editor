const $gettext = (s: string) => s
import JSZip from 'jszip'
import Papa from 'papaparse'

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
  const test = paths.filter(path =>
    path.startsWith('inputs/') || path.startsWith('outputs/') || path.startsWith('microservices/'))
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
      const content = parseCSV(bytes)
      return content
    }
  }

  return {}
}

export function parseCSV(bytes: Uint8Array | ArrayBuffer) {
  const str = new TextDecoder().decode(bytes)
  const jsonData = Papa.parse(str, {
    header: true,
    skipEmptyLines: true,
  })
  return jsonData.data
}

export function WorkerParseCSV(bytes: Uint8Array): Promise<any[]> {
  const str = new TextDecoder().decode(bytes)
  return new Promise((resolve, reject) => {
    Papa.parse(str, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: (result) => resolve(result.data),
      error: (err: unknown) => reject(err),
    })
  })
}

export function readFileAsText (file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function (event) {
      resolve(event?.target?.result as string)
    }
    reader.onerror = function (event) {
      reject(event?.target?.error)
    }
    reader.readAsText(file)
  })
}

export function readFileAsBytes (file: any): Promise<Uint8Array> {
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
