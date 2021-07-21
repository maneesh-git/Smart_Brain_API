const redisClient = require('./signin').redisClient;

const requireAuth = (req,res, next) => {

    const { authorization } = req.headers;

    if(!authorization){
        console.log("YOU SHALL NOT PASS!!!!!!")
        return res.status(401).json("Unauthorized")
    }

    return redisClient.get(authorization, (err,reply) => {
        if(err || !reply){
            return res.status(401).json("Unauthorized");
        }
        console.log("You can PASS....")
        return next()
    })
}

module.exports = {
    requireAuth : requireAuth
}



// next allows us to keep going down the chain.
// once this fucntion is run, it will keep going to the next part.
