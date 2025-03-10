export function generatePassword (length: number) {
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

function getRandomChar (characterSet: string) {
  const randomIndex = Math.floor(Math.random() * characterSet.length)
  return characterSet.charAt(randomIndex)
}

function shuffleString (str: string) {
  const array = str.split('')
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array.join('')
}
