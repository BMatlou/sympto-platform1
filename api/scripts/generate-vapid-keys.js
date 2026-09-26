const crypto = require('crypto');

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});

const jwk = publicKey.export({ format: 'jwk' });
const privatePem = privateKey.export({ format: 'pem', type: 'pkcs8' });
const privateKeyBase64 = Buffer.from(privatePem, 'utf8').toString('base64');

const publicKeyBytes = Buffer.concat([
  Buffer.from([0x04]),
  Buffer.from(jwk.x, 'base64url'),
  Buffer.from(jwk.y, 'base64url'),
]);

console.log('\nAdd these lines to api/.env:\n');
console.log(`PUSH_VAPID_PRIVATE_KEY_BASE64=${privateKeyBase64}`);
console.log(`PUSH_VAPID_PUBLIC_KEY=${publicKeyBytes.toString('base64url')}`);
console.log('PUSH_VAPID_SUBJECT=mailto:notifications@example.com');
console.log('\nSet PUSH_VAPID_SUBJECT to an address you control before deployment.\n');
