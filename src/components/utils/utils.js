import JSZip from 'jszip'

const $gettext = s => s

function readFileAsText (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function (event) {
      resolve(event.target.result)
    }
    reader.onerror = function (event) {
      reject(event.target.error)
    }
    reader.readAsText(file)
  })
}

function readFileAsBytes (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = function (event) {
      const fileBytes = new Uint8Array(event.target.result)
      resolve(fileBytes)
    }
    reader.onerror = function (event) {
      reject(event.target.error)
    }
    reader.readAsArrayBuffer(file)
  })
}

function checkPaths (paths) {
  // check that the zip files contains with inputs/ or outputs/ (as root folders.)
  const test = paths.filter(path => path.startsWith('inputs/') || path.startsWith('outputs/'))
  if (test.length === 0) {
    const err = new Error($gettext(' root folders should be inputs/ and outputs/. not: ') + paths[0])
    err.name = 'ImportError'
    throw err
  }
}

async function extractZip (file) {
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  let filesNames = Object.keys(zip.files)
  filesNames = filesNames.filter(name => !name.match(/^__MACOSX\//))
  filesNames = filesNames.filter(name => !name.endsWith('/'))
  checkPaths(filesNames)
  // process ZIP file content here
  const result = []
  for (let i = 0; i < filesNames.length; i++) {
    const str = await zip.file(filesNames[i]).async('string')
    let content = {}
    if (filesNames[i].endsWith('.json') || filesNames[i].endsWith('.geojson')) {
      try {
        content = JSON.parse(str)
      } catch (err) {
        err.name = 'ImportError in ' + filesNames[i]
        if (str.length === 0) { err.message = 'file is empty' }
        throw err
      }
    } else {
      content = await zip.file(filesNames[i]).async('uint8array')
    }
    // import with new fileStructure (inputs, outputs folder in zip)

    result.push({ path: filesNames[i], content })
  }
  return result
}

function getGroupForm (features, lineAttributes, uneditable) {
  const form = {}
  lineAttributes.forEach(key => {
    const val = new Set(features.map(link => link.properties[key]))
    form[key] = {
      value: val.size > 1 ? '' : [...val][0],
      disabled: uneditable.includes(key),
      placeholder: val.size > 1,
    }
  })
  return form
}

function indexAreUnique (geojson) {
  // check if all index are unique in a geojson (links or nodes)
  // return true if they are unique
  let indexArr = []
  if (geojson?.features.length > 0) {
    indexArr = geojson.features.map(item => item.properties.index)
    return (new Set(indexArr).size === indexArr.length)
  } else { return true } // if its empty, return true
}

function IndexAreDifferent (geojsonA, geojsonB) {
  // check if index are duplicated between geojsons (to append new links or nodes) (links or nodes)
  // return true if they are all unique
  const linksIndex = new Set(geojsonA.features.map(item => item.properties.index))
  const newLinksIndex = new Set(geojsonB.features.map(item => item.properties.index))
  return (new Set([...linksIndex, ...newLinksIndex]).size === (linksIndex.size + newLinksIndex.size))
}

function getMatchingAttr(geojsonA, geojsonB, attr = 'index') {
  // return a list of matching index in 2 geojson
  const a = new Set(geojsonA.features.map(item => item.properties[attr]))
  const b = new Set(geojsonB.features.map(item => item.properties[attr]))
  return Array.from(a).filter(i => b.has(i))
}

function getPerfectMatches(geojsonA, geojsonB, indexes) {
  // return a list of index with perfect matches
  const indexSet = new Set(indexes)
  const filterA = geojsonA.features.filter(item => indexSet.has(item.properties.index))
  const filterB = geojsonB.features.filter(item => indexSet.has(item.properties.index))

  const arrA = filterA.map(el => JSON.stringify(el))
  const setB = new Set(filterB.map(el => JSON.stringify(el)))
  const intersect = arrA.filter(i => setB.has(i))
  const matches = intersect.map(el => JSON.parse(el).properties.index)

  return matches
}

function remap(value, dict) {
  return value in dict ? dict[value] : value
}

async function unzip (file) {
  // unzip a file and return a json (solo json zipped)
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  const str = await zip.file(filesNames[0]).async('string')
  const content = JSON.parse(str)
  return content
}

// https://stackoverflow.com/questions/27979002/convert-csv-data-into-json-format-using-javascript
function csvJSON (bytes) {
  const csv = new TextDecoder().decode(bytes)
  let lines = csv.split('\n')
  lines = lines.map(line => line.replace(/\r/g, ''))
  lines = lines.filter(line => line.length > 0)
  const result = []
  // NOTE: If your columns contain commas in their values, you'll need
  // to deal with those before doing the next step
  // (you might convert them to &&& or something, then covert them back later)
  // jsfiddle showing the issue https://jsfiddle.net/
  // if (lines.length > 100000) {

  //  return [{ error: 'too many lines' }]
  // }
  const headers = lines[0].split(',')
  for (let i = 1; i < lines.length; i++) {
    const obj = {}
    const currentline = lines[i].split(',')

    for (let j = 0; j < headers.length; j++) {
      // convert to number if possible
      obj[headers[j]] = Number(currentline[j]) ? Number(currentline[j]) : currentline[j]
    }

    result.push(obj)
  }
  // return result; //JavaScript object
  return result
}

async function unzipCalendar (file) {
  // unzip a file and return a json (solo json zipped)
  const ZIP = new JSZip()
  const zip = await ZIP.loadAsync(file)
  const filesNames = Object.keys(zip.files)
  if (filesNames.includes('calendar.txt')) {
    const bytes = await zip.file('calendar.txt').async('uint8array')
    const content = csvJSON(bytes)
    return content
  }

  return {}
}

function generatePassword (length) {
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz'
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '@$!%*?&_'

  const allChars = lowercaseChars + uppercaseChars + numbers + symbols

  let password = ''

  // Ensure at least one character from each character set
  password += getRandomChar(lowercaseChars)
  password += getRandomChar(uppercaseChars)
  password += getRandomChar(numbers)
  password += getRandomChar(symbols)

  // Fill the rest of the password
  for (let i = password.length; i < length; i++) {
    password += getRandomChar(allChars)
  }

  // Shuffle the password to randomize the order
  password = shuffleString(password)

  return password
}

function getRandomChar (characterSet) {
  const randomIndex = Math.floor(Math.random() * characterSet.length)
  return characterSet.charAt(randomIndex)
}

function shuffleString (str) {
  const array = str.split('')
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array.join('')
}

export {
  readFileAsText,
  readFileAsBytes,
  extractZip,
  getGroupForm,
  indexAreUnique,
  IndexAreDifferent,
  getMatchingAttr,
  getPerfectMatches,
  remap,
  unzip,
  csvJSON,
  unzipCalendar,
  generatePassword,
}
