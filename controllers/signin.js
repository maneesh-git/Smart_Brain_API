const jwt = require('jsonwebtoken');
const redis = require('redis');

// Redis Setup
const redisClient = redis.createClient(process.env.REDIS_URI);


const handleSignin = (db, bcrypt, req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    // return res.status(400).json('incorrect form submission');
    return Promise.reject('incorrect form submission');
  }
  return db.select('email', 'hash').from('login')
    .where('email', '=', email)
    .then(data => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db.select('*').from('users')
          .where('email', '=', email)
          .then(user => user[0])
          .catch(err => Promise.reject('unable to get user'))
      } else {
        Promise.reject('wrong credentials')
      }
    })
    .catch(err => Promise.reject('wrong credentials'))
}

const getAuthTokenId = (req,res) => {
  // grab the user ID from the redis DB.

  const { authorization } = req.headers;
  return redisClient.get(authorization, (err, reply) => {
    if(err || !reply){
      return res.status(400).json("Unauthorized")
    }
    return res.json({ id : reply })
  })

}

const signToken = (email) => {
  // Payload is some data that the JWT token will hold.
  // JWT-SECRET will be a secret key to sign every token by this server,
  // so in production we will probably use a environment variable here.
  
  const jwtPayload = { email };
  return jwt.sign(jwtPayload, 'JWT-SECRET', { expiresIn: '2 days'});
}

// Saving the JWT token and user's ID in Redis DB
// Key = JWT token
// Value =  User's ID in postgreSQL
const setToken = (key, value) => {
  return Promise.resolve(redisClient.set(key,value))
}


// create the JWT token and return user data
const createSessions = (user) => {
  const { email, id } = user;
  const token = signToken(email);
  return setToken(token,id)
    .then(() => {
      return { success : 'true', userId: id, token};
    })
    .catch(console.log)  
}

const signinAuthentication = (db, bcrypt) => (req,res) => {
  const { authorization } = req.headers;
  return authorization ? getAuthTokenId(req,res) :
    handleSignin(db, bcrypt, req,res)
      .then(data => { 
        return data.id && data.email ? createSessions(data) : Promise.reject(data)
      })
      .then(session => res.json(session))
      .catch(err => res.status(400).json(err))
}

module.exports = {
  signinAuthentication : signinAuthentication,
  redisClient : redisClient
}

/*
See video 23,24 in Sessions + JWTs 
  Now because signinAuthentication method is the handler of the endpoint /signin
  this method must be responsible for returning a response which maybe a status 200 or json response.

  We dont want handleSignin to be returning the res.json or res.status.json error response,
  because this is just a helper function now we use inside of our main handler function which is the signinAuthentication.

  If some new developer comes in and returns a response in signinAuthentication,
  it will result in a lot of errors,
  because we cant send multiple responses.

  So we keep things clean,
  whatever method handles the actual endpoint should be the one that actually returns a response.

  so we will just change all the responses to just return a promise in handleSignin method,
  because at the end of the day, handleSignin is sort of handling promises.

  Since handleSignin will return a promise, we will do a .then and a .catch
  to handle the response of the promise

  Now, first time the user signs in, he/she may not have a session or a token,
  so we need to generate and send the token after checking if the email and password of the user match. 
  This is what we do in createSessions.
  After handleSignin is called, createSession will be called to create a JWT token,
  and return a session that contains the JWT token, the userId and the success message.

*/