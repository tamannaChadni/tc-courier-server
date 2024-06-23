const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 8000;

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174",'https://tc-courier-59107.web.app/'],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  // console.log(token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.avbafwc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("tccourier");

    const usersCollection = db.collection("users");
    const parcelCollection = db.collection("parcel");
    const deliveryCollection = db.collection("delivey");

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "365d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });
    // Logout
    app.get("/logout", async (req, res) => {
      try {
        res
          .clearCookie("token", {
            maxAge: 0,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
          .send({ success: true });
        // console.log("Logout successful");
      } catch (err) {
        res.status(500).send(err);
      }
    });

    app.get("/users", verifyToken, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      // console.log(req.params.email);
      const result = await usersCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(result);
      // res.send({ hi: "Hii" });
    });

    app.post("/users", async (req, res) => {
      const user  = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


    app.patch('/users/update/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email }
      const updateDoc = {
        $set: { ...user, timestamp: Date.now() },
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    // parcel book
    app.post("/parcel", async (req, res) => {
      const parcelBook = req.body;
      const result = await parcelCollection.insertOne(parcelBook);
      res.send(result);
    });
    
    app.get("/parcel", async (req, res) => {
      const { userId } = req.query;
      const cursor = parcelCollection.find({ userId });
      const result = await cursor.toArray();
      res.send(result);
    });


    app.put("/parcel/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateParcel = req.body;

      const parcel = {
        $set: {
          parcelType: updateParcel.parcelType,
          requestedDeliveryDate: updateParcel.requestedDeliveryDate,
          
        },
      };

      const result = await parcelCollection.updateOne(
        filter,
        parcel,
        options
      );
      res.send(result);
    });


    app.get("/parcel/:email", async (req, res) => {
      // console.log(req.params.email);
      const result = await parcelCollection
        .find({ email: req.params.email })
        .toArray();
      res.send(result);
      // res.send({ hi: "Hii" });
    });



    app.delete("/parcel/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await parcelCollection.deleteOne(query);
      res.send(result);
    });



    app.get("/review", async (req, res) => {
      const { deliveryManId } = req.query;
      const cursor = deliveryCollection.find({ deliveryManId });
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/deliveyMan", async (req, res) => {
      const { deliveryManId } = req.query;
      const cursor = deliveryCollection.find({ deliveryManId });
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/delivery-men", async (req, res) => {
      
      const cursor = deliveryCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.patch('/parcel/:id', async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      try {
        const parcel = await deliveryCollection.findByIdAndUpdate(id, { status }, { new: true });
        res.status(200).send(parcel);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    app.get('/users', async (req, res) => {
      try {
        const users = await usersCollection.find();
        res.status(200).send(users);
      } catch (error) {
        res.status(500).send(error);
      }
    });
    
    // Handle PATCH request to update user role
    app.patch('/users/:id', async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;
      try {
        const user = await usersCollection.findByIdAndUpdate(id, { role }, { new: true });
        res.status(200).send(user);
      } catch (error) {
        res.status(500).send(error);
      }
    });
    
    
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("courier server is running");
});

app.listen(port, () => {
  console.log(`courier: ${port}`);
});
