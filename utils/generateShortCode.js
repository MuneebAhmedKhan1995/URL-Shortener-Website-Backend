import crypto from 'crypto';

const generateShortCode = (length = 6) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let shortCode = '';
  
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytes[i] % characters.length;
    shortCode += characters[randomIndex];
  }
  
  return shortCode;
};

const generateUniqueShortCode = async (UrlModel, length = 6) => {
  let shortCode;
  let isUnique = false;
  
  while (!isUnique) {
    shortCode = generateShortCode(length);
    
    const existingUrl = await UrlModel.findOne({ shortCode });
    if (!existingUrl) {
      isUnique = true;
    }
  }
  
  return shortCode;
};

export default { generateShortCode, generateUniqueShortCode };