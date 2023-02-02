const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json())
app.use(cors())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cvfcjbu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//     const collection = client.db("test").collection("devices");
//     // perform actions on the collection object
//     client.close();
// });


async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db('creative_agency').collection('services');
        const orderCollection = client.db('creative_agency').collection('orders');
        const reviewCollection = client.db('creative_agency').collection('reviews');
        const projectQueryCollection = client.db('creative_agency').collection('projects');
        const userCollection = client.db('creative_agency').collection('users')

        // load 3 services from 5 service 
        app.get('/v1/services', async (req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query).limit(3);
            const result = await cursor.toArray();
            res.send(result)
        });
        // load single service from 5 service 
        app.get('/v1/service/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id)
            const query = { _id: ObjectId(id) };
            // console.log(query)
            const result = await serviceCollection.findOne(query);
            // console.log(result)
            // const result = await cursor.toArray();
            res.send(result)
        });

        // identify already exist user in database
        app.put('/v1/exist/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token })
        })

        // store client order 
        app.post('/v1/clientorder', async (req, res) => {
            const clientOrder = req.body;
            console.log(clientOrder)
            const result = await orderCollection.insertOne(clientOrder);
            res.send(result);

        });
        // store client review
        app.post('/v1/clientreview', async (req, res) => {
            const clientreview = req.body;
            console.log(clientreview)
            const result = await reviewCollection.insertOne(clientreview);
            res.send(result);
        })
        // store project details 
        app.post('/v1/projectdetails', async (req, res) => {
            const projectdetails = req.body;
            // console.log(projectdetails);
            const result = await projectQueryCollection.insertOne(projectdetails);
            res.send(result);
        })




    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    // console.log('connected')
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})