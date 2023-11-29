const express = require('express')
require('dotenv').config()
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000




// middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ruzxtxl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});




async function run() {
    try {

        const productsCollection = client.db('trendNestDB').collection('products');
        const userCollection = client.db('trendNestDB').collection('users');
        const membershipCollection = client.db('trendNestDB').collection('membership');
        const reviewCollection = client.db('trendNestDB').collection('review');
        const voteCollection = client.db('trendNestDB').collection('upVote');
        const reportCollection = client.db('trendNestDB').collection('report');
        const couponCollection = client.db('trendNestDB').collection('coupon');




        // middlewares 
        const verifyToken = async (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'forbidden access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'forbidden access' })
                }
                req.decoded = decoded;
                next();
            })
        }


        // admin verify 
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            next()
        }


        // admin verify 
        const verifyModerator = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query)
            const isModerator = user?.role === 'moderator';
            if (!isModerator) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            next()
        }



        // Auth Related API
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })



        app.post('/menu', async (req, res) => {
            const item = req.body;
            const result = await productsCollection.insertOne(item);
            res.send(result)
        })


        app.get('/menu', verifyToken, async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await productsCollection.find(query).toArray()
            res.send(result)
        })


        app.delete('/product-delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.deleteOne(query);
            res.send(result)
        })



        // product Update 

        app.get('/product-update/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.findOne(query);
            res.send(result)
        })


        app.patch('/product-update/:id', async (req, res) => {
            const item = req.body
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedItem = {
                $set: {
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    recipe: item.recipe,
                    image: item.image
                }
            }
            const result = await productsCollection.updateOne(filter, updatedItem)
            res.send(result)
        })



        // ----------- ::::::: [ get user api for role ] ::::: ----------------

        app.get('/user/:email', async (req, res) => {
            const email = req.params.email
            const result = await userCollection.findOne({ email })
            res.send(result)
        })




        // ----------- ::::::: [ get user api ] ::::: ----------------


        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {

            const result = await userCollection.find().toArray();
            res.send(result)
        })

        app.get('/user-update/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.findOne(query);
            res.send(result)
        })

        app.put('/user-update/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedRole = req.body
            const role = {
                $set: {
                    role: updatedRole.role
                }
            }
            const result = await userCollection.updateOne(filter, role);
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




        // admin coupon set up 

        app.post('/coupons', async (req, res) => {
            const coupon = req.body;
            const result = await couponCollection.insertOne(coupon)
            res.send(result)

        })

        app.get('/coupons', async (req, res) => {
            const result = await couponCollection.find().toArray()
            res.send(result)
        })

        app.get('/coupon/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await couponCollection.findOne(query)
            res.send(result)
        })


        app.patch('/coupon-update/:id', async (req, res) => {
            const item = req.body
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedItem = {
                $set: {
                    discount: item.discount,
                    coupon: item.coupon,
                    description: item.description,
                    endDate: item.endDate
                }
            }
            const result = await couponCollection.updateOne(filter, updatedItem)
            res.send(result)
        })


        app.delete('/coupon-delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await couponCollection.deleteOne(query);
            res.send(result)
        })









        //-------------- :::::::::::::::: ------------------
        // ----------- ::::::: public product api ::::::: --------------

        app.get('/all-products', async (req, res) => {
            const result = await productsCollection.find().toArray()
            res.send(result)
        })


        // pagination 

        app.get('/productsCount', async (req, res) => {
            const count = await productsCollection.estimatedDocumentCount();
            res.send({ count });
        })

        app.get('/products-pagination', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);

            const result = await productsCollection.find()
                .skip(page * size)
                .limit(size)
                .toArray();
            res.send(result);
        })

        app.get('/product-details/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.findOne(query);
            res.send(result)
        })


        app.post('/product-reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })


        app.get('/product-review/:id', async (req, res) => {
            const id = req.params.id;
            const query = { productId: id }
            const result = await reviewCollection.find(query).toArray();
            res.send(result)
        })


        // product vote 
        app.post('/product-vote', async (req, res) => {
            const vote = req.body;
            const result = await voteCollection.insertOne(vote)
            res.send(result)
        })





        app.get('/product-vote/:id', async (req, res) => {
            const id = req.params.id;
            const query = { productId: id }
            const result = await voteCollection.find(query).toArray();
            res.send(result)
        })


        app.post('/product-report', async (req, res) => {
            const report = req.body;
            const result = await reportCollection.insertOne(report)
            res.send(result)
        })


        app.get('/product-report/:id', async (req, res) => {
            const id = req.params.id;
            const query = { productId: id }
            const result = await reportCollection.find(query).toArray();
            res.send(result)
        })



        app.get('/report-product', async (req, res) => {
            const result = await reportCollection.find().toArray()
            res.send(result)
        })

        //-------------- :::::::::::::::: ------------------
        // ------------::::: moderator api :::::---------------

        app.get('/products', verifyToken, verifyModerator, async (req, res) => {
            const result = await productsCollection.find().toArray()
            res.send(result)
        })


        app.get('/product-status/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.findOne(query);
            res.send(result)
        })

        app.put('/product-status/:id', verifyToken, verifyModerator, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedStatus = req.body
            const status = {
                $set: {
                    status: updatedStatus.status
                }
            }

            const result = await productsCollection.updateOne(filter, status);
            res.send(result)
        })


        app.patch('/product-featured/:id', verifyToken, verifyModerator, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'featured'
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })



        //-------------- :::::::::::::::: ------------------
        // ------------::::: Payment intent :::::---------------
        //-------------- :::::::::::::::: ------------------

        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            })

        })



        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await membershipCollection.insertOne(payment)
            console.log('payment info', payment);

            res.send(paymentResult)
        })


        app.get('/payments/:email', async (req, res) => {
            const user = req.params.email;
            const query = { email: user }
            const result = await membershipCollection.findOne(query);
            res.send(result)
        })


        app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
            const users = await userCollection.estimatedDocumentCount();
            const products = await productsCollection.estimatedDocumentCount();
            const orders = await reviewCollection.estimatedDocumentCount();

            res.send({
                users, products, orders
            })
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