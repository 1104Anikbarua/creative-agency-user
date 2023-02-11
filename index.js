const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const SSLCommerzPayment = require('sslcommerz-lts');
const { query } = require('express');

const app = express();
const port = process.env.PORT || 5000;

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false //true for live, false for sandbox

app.use(express.json())
app.use(cors())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cvfcjbu.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//     const collection = client.db("test").collection("devices");
//     // perform actions on the collection object
//     client.close();
// });

const verifyJwt = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    // console.log('verify inside jwt', authHeader)
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }
    const token = authHeader.split(' ')[1]
    // console.log('TOKEN', token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db('creative_agency').collection('services');
        const orderCollection = client.db('creative_agency').collection('orders');
        const reviewCollection = client.db('creative_agency').collection('reviews');
        const projectQueryCollection = client.db('creative_agency').collection('projects');
        const userCollection = client.db('creative_agency').collection('users')
        const paymentCollection = client.db('creative_agency').collection('payments');

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
        // load user order using user email
        app.get('/v1/order', verifyJwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const result = await orderCollection.find(query).toArray();
                res.send(result)
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
            // console.log(decodedEmail);
            // console.log(email);
            // const authorization = req.headers.authorization;
            // console.log(authorization)
            // console.log(query);
            // console.log(result)
        });

        // load product for payment
        app.get('/v1/order/:id', verifyJwt, async (req, res) => {
            const productId = req.params.id;
            // console.log(productId)
            const query = { _id: ObjectId(productId) }
            // console.log(query)
            const result = await orderCollection.findOne(query);
            res.send(result);
        });

        // app.get('/v1/update', async (req, res) => {
        //     const email = req.query.email;
        //     // console.log(email);
        //     const query = { email: email };
        //     const result = await paymentCollection.find(query).toArray();
        //     res.send(result);
        // })



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
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5d' })
            res.send({ result, token })
        });

        // store client order 
        app.post('/v1/clientorder', async (req, res) => {
            const clientOrder = req.body;
            // console.log(clientOrder)
            const result = await orderCollection.insertOne(clientOrder);
            res.send(result);

        });
        // store client review
        app.post('/v1/clientreview', async (req, res) => {
            const clientreview = req.body;
            // console.log(clientreview)
            const result = await reviewCollection.insertOne(clientreview);
            res.send(result);
        })
        // store project details 
        app.post('/v1/projectdetails', async (req, res) => {
            const projectdetails = req.body;
            // console.log(projectdetails);
            const result = await projectQueryCollection.insertOne(projectdetails);
            res.send(result);
        });
        // recive payment method and create payment invoice
        app.put('/v1/payment/:email', verifyJwt, async (req, res) => {
            const serviceId = req.params.id;
            console.log('serviceId', serviceId);

            // const userEmail = req.params.email;
            // console.log('User email', userEmail);

            const orderDetails = req.body;
            console.log('orderDetails', orderDetails);
            // console.log(new ObjectId().toString())
            const transactionId = new ObjectId().toString();
            const data = {
                total_amount: orderDetails.servicePrice,
                tran_id: transactionId, // use unique tran_id for each api call
                success_url: `http://localhost:5000/v1/updatepayment/success/${transactionId}`,

                fail_url: 'http://localhost:5000/v1/updatepayment/success',

                cancel_url: 'http://localhost:5000/v1/updatepayment/success',
                ipn_url: 'http://localhost:3030/ipn',
                shipping_method: 'Courier',
                product_name: orderDetails.serviceName,
                product_category: 'Electronic',
                product_profile: 'general',
                cus_name: orderDetails.companyName,
                cus_email: orderDetails.email,
                cus_add1: 'Dhaka',
                cus_add2: 'Dhaka',
                cus_city: 'Dhaka',
                cus_state: 'Dhaka',
                cus_postcode: '1000',
                cus_country: 'Bangladesh',
                cus_phone: '01811111111',
                cus_fax: '01711111111',
                ship_name: 'Customer Name',
                ship_add1: 'Dhaka',
                ship_add2: 'Dhaka',
                ship_city: 'Dhaka',
                ship_state: 'Dhaka',
                ship_postcode: 1000,
                ship_country: 'Bangladesh',
            };
            // console.log(data);

            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
            sslcz.init(data).then(apiResponse => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL;
                const filter = { serviceId: serviceId };
                const options = { upsert: true };
                const updatedDoc = {
                    $set: {
                        serviceId: orderDetails.serviceId,
                        email: orderDetails.email,
                        companyName: orderDetails.companyName,
                        projectDescription: orderDetails.
                            projectDescription,
                        paid: false,
                        transactionId
                    }
                };
                // console.log(updatedDoc)
                orderCollection.updateOne(filter, updatedDoc, options);

                // orderCollection.updateOne({
                //     ...orderDetails,
                //     paid: false,
                //     transactionId,
                // })

                res.send({ url: GatewayPageURL })
                // console.log('Redirecting to: ', GatewayPageURL)
            });

            // update order status
            app.post('/v1/updatepayment/success/:id', async (req, res) => {
                // console.log('success');

                const transactionId = req.params.id;
                const result = await orderCollection.updateOne({ transactionId }, { $set: { paid: true } });

                if (result.modifiedCount > 0) {
                    res.redirect(`http://localhost:3000/v1/updatepayment/success/${transactionId}`)
                }
            })


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