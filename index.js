const express = require('express')
require('dotenv').config()
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 5000




// middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));

app.use(cookieParser());


const { MongoClient, ServerApiVersion } = require('mongodb');


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ruzxtxl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// middlewares 
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('Value of token of middleware', token);
    if (!token) {
        return res.status(401).send({ message: 'Not authorized' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        //  error
        if (err) {
            console.log(err);
            return res.status(401).send({ message: 'Unauthorized' })
        }
        // If token is valid then it would be decoded
        console.log('Value in the token', decoded);
        req.user = decoded;
        next();
    })
}


async function run() {
    try {

        const productsCollection = client.db('trendNestDB').collection('products');
        const userCollection = client.db('trendNestDB').collection('users');


        // Auth Related API
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true })
        })

        app.post('/logout', async (req, res) => {
            const user = req.body;
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })


        app.post('/menu', async (req, res) => {
            const item = req.body;
            const result = await productsCollection.insertOne(item);
            res.send(result)
        })



        // ----------- ::::::: [user collection api] ::::: ----------------

        app.post('/user-email', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }

            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user already exist', insertedId: null })
            }

            const result = await userCollection.insertOne(user);
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})