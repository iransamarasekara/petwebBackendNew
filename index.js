const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const path = require("path");
const cors = require("cors");
const bcrypt = require('bcryptjs');

const cloudinary = require('cloudinary').v2;
const bodyParser = require('body-parser');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
require("dotenv").config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');

app.use(express.json());
const allowedOrigins = ['https://poo-poo-shop.netlify.app', 'https://poopooshop.lk', 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', 'https://poo-poo-shop-admin-dashboard.netlify.app']; // Add your frontend URLs here

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'images',
      public_id: (req, file) => `${file.originalname.split('.')[0]}_${Date.now()}`,
    },
  });
  
  const upload = multer({ storage });

app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));


// Database Connection With MongoDB
const uri = process.env.MONGODB_URI;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected...');
    createAdmins();
  })
  .catch(err => console.error('MongoDB connection error:', err));

const { timeStamp } = require("console");

app.get("/", async (req, res)=>{
    res.send("Express App is Running")
})

app.post('/upload', upload.any(), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded.' });
      }
  
      // Collect the URLs of uploaded images
      const uploadedFileUrls = req.files.map((file) => file.path);
  
      res.json({
        success: true,
        image_urls: uploadedFileUrls, // Return all uploaded file URLs
      });
    } catch (error) {
      console.error('Error uploading files to Cloudinary:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading files to Cloudinary',
        error: error.message,
      });
    }
  });

// //photo upload
// app.get('/upload', async (req, res) =>{
//     let url = await putObject("test.mp4", "video/mp4");
//     console.log(url);
// })

// Image Storage Engine

// const storage = multer.diskStorage({
//     destination: './upload/images',
//     filename:(req, file, cb)=>{
//         return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
//     }
// })

// const upload = multer({storage:storage})

//Creating Upload Endpoint for images

// app.use('/images',express.static('upload/images'))

// app.post("/upload", upload.single('product'),(req,res)=>{
//     res.json({
//         success:1,
//         image_url: `http://localhost:${port}/images/${req.file.filename}`
//     })
// })

// Schema for Creating Products

const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: [String], // Store an array of image URLs as strings
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    categoryFor: {
        type: [String],
        required: true,
    },
    new_price: {
        type: Number,
    },
    old_price: {
        type: Number,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
    description: {
        formatted_text: {
            type: String,
        },
        bullet_points: {
            type: [String], 
        },
        plain_text: {
            type: String, 
        },
    },
    rating: {
        type: Number,
    },
    reviewText: [
        {
            text: {
                type: String,
            },
            rating: {
                type: Number,
            },
        },
    ],
    no_of_rators: {
        type: Number,
    },
});

// Creating add product endpoint
app.post('/addproduct', async (req, res) => {
    console.log('Request body:', req.body); // Debugging log
  
    try {
      // Fetch the last product to determine the next id
      const lastProduct = await Product.findOne().sort({ id: -1 });
  
      // If there are no products, start with id = 1
      const id = lastProduct ? lastProduct.id + 1 : 1;
  
      // Extract image URLs from uploaded files
      const imageUrls = req.body.image_urls || [];
    //   const files = req.body.images; // Assuming images are sent as base64 strings
  
    //   for (const file of files) {
    //     const result = await cloudinary.uploader.upload(file, {
    //       folder: 'images',
    //       public_id: `${Date.now()}`,
    //     });
  
    //     // Store the uploaded file URL
    //     imageUrls.push(result.secure_url);
    //   }
  
      // Structure the description object
    const description = {
        formatted_text: req.body.description?.formatted_text || '',
        bullet_points: req.body.description?.bullet_points
          ? JSON.parse(req.body.description.bullet_points)
          : [],
        plain_text: req.body.description?.plain_text || '',
      };
  
      // Create a new product
      const product = new Product({
        id: id,
        name: req.body.name,
        image: imageUrls, // Use the uploaded image URLs
        category: req.body.category,
        categoryFor: req.body.categoryFor,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
        description: description, // Use the structured description
        rating: req.body.rating,
        no_of_rators: req.body.no_of_rators,
        available: req.body.available,
      });
  
      // Save the new product
      await product.save();
      console.log(product);
      
      console.log('Product saved successfully');
  
      // Respond to the client
      res.json({
        success: true,
        name: req.body.name,
        product: product,
      });
    } catch (error) {
      console.error('Error saving product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save product',
        error: error.message,
      });
    }
  });
  
  // Creating edit product endpoint
  app.put('/editproduct/:id', async (req, res) => {
    try {
      const { id } = req.params; // Extract product ID from URL
      const updatedData = req.body; // Extract other updated product fields
  
      // Validate that `id` is provided
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required',
        });
      }
  
      // Handle image uploads if new images are provided
    //   if (req.body.images && req.body.images.length > 0) {
    //     const imageUrls = [];
    //     const files = req.body.images; // Assuming images are sent as base64 strings
  
    //     for (const file of files) {
    //       const result = await cloudinary.uploader.upload(file, {
    //         folder: 'images',
    //         public_id: `${Date.now()}`,
    //       });
  
    //       // Store the uploaded file URL
    //       imageUrls.push(result.secure_url);
    //     }
  
    //     updatedData.images = imageUrls; // Update image URLs in product data
    //   }
  
      // Parse description if provided (handle possible JSON string input)
      if (updatedData.description) {
        updatedData.description = {
          formatted_text: updatedData.description?.formatted_text || '',
          bullet_points: updatedData.description?.bullet_points
            ? JSON.parse(updatedData.description.bullet_points)
            : [],
          plain_text: updatedData.description?.plain_text || '',
        };
      }
  
      // Update the product in the database
      const updatedProduct = await Product.findOneAndUpdate(
        { id }, // Match the product by its `id` field
        updatedData, // Apply updated data
        { new: true, runValidators: true } // Return updated product and run validation
      );
  
      // Handle case where product is not found
      if (!updatedProduct) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }
  
      console.log(`Product updated successfully: ${updatedProduct.name}`);
      res.json({
        success: true,
        message: 'Product updated successfully',
        product: updatedProduct,
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while updating product',
        error: error.message,
      });
    }
  });


// Creating API for deleting products

app.post('/removeproduct/:id', async (req, res) => {
    try {
        const id = req.params.id; // Extract the id from the URL parameters
        const product = await Product.findByIdAndDelete(id); // Use findByIdAndDelete for simplicity

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        console.log(`Product removed: ${product.name}`);
        res.json({
            success: true,
            message: `Product ${product.name} removed successfully`
        });
    } catch (error) {
        console.error('Error removing product:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while removing the product'
        });
    }
});


//creating endpoint for getting related products
app.post('/getrelatedproducts', async (req,res)=>{
    let products = await Product.find({category:req.body.category});
    let related_products = products.slice(-4).reverse();
    console.log("Related products fetched");
    res.send(related_products);
})
//creating API for set available or not
app.post('/addavailability/:id', async (req, res) => {
    try {
        const { id } = req.params; // Extract product ID from URL parameter
        const { available } = req.body; // Extract availability status from request body

        // Validate the availability input
        if (typeof available !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'Invalid value for "available". It must be a boolean.',
            });
        }

        // Update the product's availability status
        const updatedProduct = await Product.findOneAndUpdate(
            { id }, // Match the product by ID
            { available }, // Update the "available" field
            { new: true } // Return the updated product
        );

        // Handle case where product is not found
        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        console.log(`Availability updated for product ID: ${id}`);
        res.json({
            success: true,
            message: 'Availability status updated successfully',
            product: updatedProduct, // Include the updated product in the response
        });
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating availability',
        });
    }
});

app.get('/product/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findOne({ id });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        res.json({
            success: true,
            product,
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching product',
        });
    }
});


//creating API for set reviews and ratings
app.post('/addreview', async (req, res) => {
    try {
        console.log("Adding review for item:", req.body.itemId);

        // Find the product by id
        let currentProduct = await Product.findOne({ id: req.body.itemId });
        if (!currentProduct) {
            return res.status(404).send("Product not found");
        }

        // Calculate the new rating
        const newRating = (currentProduct.rating * currentProduct.no_of_rators + req.body.rating) / (currentProduct.no_of_rators + 1);

        // Update the product: push the new review, update rating, and increment no_of_rators
        await Product.findOneAndUpdate(
            { id: req.body.itemId },
            {
                $push: {
                    reviewText: {
                        text: req.body.text,
                        rating: req.body.rating
                    }
                },
                $set: {
                    rating: newRating
                },
                $inc: {
                    no_of_rators: 1
                }
            }
        );

        res.send("Review added successfully");
    } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).send("Error adding review");
    }
});


app.post('/addrating',async (req,res)=>{
    console.log("ratingAdded",req.body.itemId);
    let currentProduct = await Product.findOne({id:req.body.itemId});
    currentProduct.rating = req.body.rating;
    currentProduct.no_of_rators += 1;
    await Product.findOneAndUpdate({id:req.body.itemId},{rating:currentProduct.rating, no_of_rators:currentProduct.no_of_rators});
    res.send("ratingAdded")
})



// Creating API for getting all products

app.get('/allproducts', async (req, res) => {
    const limit = parseInt(req.query.limit) || 20; // Default limit
    const page = parseInt(req.query.page) || 1; // Default page
    const category = req.query.category || ""; // Category filter
    const search = req.query.search || ""; // Search keyword
    const pet = req.query.pet || ""; // Pet filter

    try {
        const skip = (page - 1) * limit;

        // Build the query object
        const query = {};

        // Filter by category if provided
        if (category) {
            query.category = category; // Exact match on category
        }

        // Add search functionality (search by name, description, or categoryFor)
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } }, // Case-insensitive search in name
                { "description.formatted_text": { $regex: search, $options: "i" } }, // Search in formatted description
                { "description.plain_text": { $regex: search, $options: "i" } }, // Search in plain description
                { categoryFor: { $regex: search, $options: "i" } }, // Search in categoryFor array
            ];
        }

        // Filter by `pet` if provided
        if (pet) {
            query.categoryFor = { $regex: pet, $options: "i" }; // Case-insensitive match for `pet` in categoryFor array
        }

        // Fetch the filtered products
        const products = await Product.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ date: -1 }); // Sort by the most recent products

        // Get the total count of products matching the query
        const totalProducts = await Product.countDocuments(query);

        res.json({
            products,
            total: totalProducts, // Total number of filtered products
        });

        console.log(`Page ${page}, Limit ${limit}, Category: ${category}, Search: ${search}, Pet: ${pet} - Products fetched`);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Failed to fetch products" });
    }
});


// Shema creating for User model

// const Users = mongoose.model('Users', {
//     email:{
//         type:String,
//     },
//     name:{
//         type:String,
//     },
//     password:{
//         type:String,
//     },
//     cartData:{
//         type:Object,
//     },
//     date:{
//         type:Date,
//         default:Date.now,
//     },
//     index:{
//         type:String,
//         required:true,
//     },
//     faculty:{
//         type:String,
//         required:true,
//     },
//     department:{
//         type:String,
//         required:true,
//     },
//     batch:{
//         type:String,
//         required:true,
//     },
//     profile_pic:{
//         type:String,
//     },
//     isVerified:{
//         type:Boolean,
//         default:false,
//     }
// })



// creating endpoint for registering user
// app.post('/signup', async(req, res)=>{

//     let users = await Users.find({});
//     let id;
//     if(users.length>0)
//     {
//         id = users.length+1;
//     }
//     else{
//         id=1;
//     }

//     let check = await Users.findOne({email:req.body.email});
//     let check1 = await Users.findOne({name:req.body.name});
//     let check2 = await Users.findOne({password:req.body.password});
//     let check3 = await Users.findOne({index:req.body.index});
    
//     if(check){
//         return res.status(400).json({success:false,errors:"existing user found with same email address."})
//     }
//     if(check1){
//         return res.status(400).json({success:false,errors:"existing user found with same username. enter your full name."})
//     }
//     if(check2){
//         return res.status(400).json({success:false,errors:"try another password."})
//     }
//     if(check3){
//         return res.status(400).json({success:false,errors:"existing user found with same index. please contact via whatsApp."})
//     }
//     let cart =[];
//     for(let i =0; i < 300; i++){
//         let q = 0;
//         let size =[];
//         let color =[];
//         cart.push({
//             q,
//             size,
//             color,
//         })
//     }
//     const user = new Users({
//         name: req.body.username,
//         email: String(id),
//         password: req.body.password,
//         cartData: cart,
//         index: req.body.index,
//         faculty: req.body.faculty,
//         department: req.body.department,
//         batch: req.body.batch,
//         profile_pic: req.body.profile_pic,
//         isVerified: false,
//     });

    // const token = jwt.sign({ user: userData }, 'secret_ecom', { expiresIn: '1h' });

    // await user.save();

    // const data = {
    //     user:{
    //         id:user.id,
    //         email:req.body.email
    //     }
    // }
    // const token = jwt.sign(data, 'secret_ecom', { expiresIn: '24h' });
    // res.json({success:true,token})

    /** send mail to user */
    // let testAccount = await nodemailer.createTestAccount();
    // let config = {
    //     service : 'gmail',
    //     auth : {
    //         user: process.env.EMAIL,
    //         pass: process.env.PASSWORD
    //     }
    // }

    // const transporter = nodemailer.createTransport({
    //     host: "smtp.ethereal.email",
    //     port: 587,
    //     secure: false, // Use `true` for port 465, `false` for all other ports
    //     auth: {
    //       user: testAccount.user,
    //       pass: testAccount.pass,
    //     },
    //   });

    // const transporter = nodemailer.createTransport(config);
    // const verificationUrl = `https://moramerc.lk/verify-email?token=${token}`;


    // let message = {
    // from: 'MORAMERC', // sender address
    // to: req.body.email, // list of receivers
    // subject: "Register for MORAMERC", // Subject line
    // text: `Please verify your email by clicking on the following link: ${verificationUrl}`,
    // html: `Please verify your email by clicking on the following link: <a href="${verificationUrl}">${verificationUrl}</a>`,
    // }

    // transporter.sendMail(message, (err, info) => {
    //     if (err) {
    //         console.error('Error sending email', err);
    //         return res.status(500).json({ success: false, errors: 'Error sending verification email' });
    //     } else {
    //         console.log('Verification email sent', info.response);
    //         res.json({ success: true, token });
    //     }
    // });
    // .then(()=>{
    // const token = jwt.sign(data, 'secret_ecom');
    // return res.status(201).json({ 
    //     msg: "you should raceive an email", 
    //     success:true,
    //     token,
    // })
    // }).catch(error => {
    // return res.status(500).json({error})
    // })

    /** end of sending mail  */

    
// })

// app.get('/verify-email', async (req, res) => {
//     const token = req.query.token;

//     if (!token) {
//         console.log('Invalid or missing token');
//         return res.status(400).json({ error: 'Invalid or missing token' });
//     }

//     try {
//         const decoded = jwt.verify(token, 'secret_ecom');
//         const user = await Users.findById(decoded.user.id);
//         if (!user) {
//             console.log('User not found');
//             return res.status(400).json({ error: 'User not found' });
//         }

//         user.isVerified = true;
//         user.email = decoded.user.email;
//         await user.save();
//         console.log('Email verified successfully!');
//         res.status(200).json({ message: 'Email verified successfully!' });
//     } catch (err) {
//         console.log('Invalid or expired token');
//         return res.status(400).json({ error: 'Invalid or expired token' });
//     }
// });


///////////////////////////////////////////////////////////
// Creating API for getting all users

// app.get('/allusers',async (req, res)=>{
//     let users = await Users.find({});
//     console.log("All Users Fetched");
//     res.send(users);
// })

// Creating API for remove user

// app.post('/removeuser', async(req, res)=>{
//     await Users.findOneAndDelete({email:req.body.email});
//     console.log("User Removed");
//     res.json({
//         success:true,
//         email:req.body.email
//     })
// })


////////////////////////////////////////////////////////////////////

// creating endpoint for user login

// app.post('/login',async (req, res)=>{
//     let user = await Users.findOne({email:req.body.email});
//     if(user){
//         const passCompare = req.body.password===user.password;
//         if(passCompare && user.isVerified){
//             const data = {
//                 user:{
//                     id:user.id
//                 }
//             }
//             const token = jwt.sign(data,'secret_ecom');
//             res.json({success:true,token});
//         }
//         else{
//             res.json({success:false, errors:"Wrong Email or Password"});
//         }
//     }
//     else{
//         res.json({success:false, errors:"Wrong Email or Password"})
//     }
// })

//creating endpoint for newcollection data
app.get('/newcollections', async (req, res)=>{
    let products = await Product.find({});

    let newcollection = products.slice(-8).reverse();
    console.log("NewCollection Fetched");
    res.send(newcollection);
})

app.get('/featureproducts', async (req, res) => {
    try {
        // Fetch all products from the database
        const products = await Product.find();

        // Filter products that have both old_price and new_price defined
        const productsWithDiscounts = products.filter(product => product.old_price && product.new_price);

        // Calculate the discount for each product and sort by the highest discount
        const sortedProducts = productsWithDiscounts
            .map(product => ({
                ...product._doc, // Spread the product fields
                discount: (product.old_price - product.new_price) / product.old_price, // Calculate discount percentage
            }))
            .sort((a, b) => b.discount - a.discount); // Sort by discount in descending order

        // Get the top 4 products with the highest discount
        const topDiscountedProducts = sortedProducts.slice(0, 6);

        console.log("Feature products fetched");
        res.json(topDiscountedProducts);
    } catch (error) {
        console.error("Error fetching feature products:", error);
        res.status(500).send("Failed to fetch feature products");
    }
});


// creating middelware to fetch user
    // const fetchUser = async (req,res,next)=>{
    //     const token = req.header('auth-token');
    //     if(!token){
    //         res.status(401).send({errors:"Please authenticate using valid token"})
    //     }
    //     else{
    //         try{
    //             const data = jwt.verify(token,'secret_ecom');
    //             req.user = data.user;
    //             next();
    //         }catch(error){
    //             res.status(401).send({errors:"Please authenticate using valid token"})
    //         }
    //     }
    // }

//creating endpoint for adding products in cartdata
// app.post('/addtocart',fetchUser,async (req,res)=>{
//     console.log("added",req.body.itemId);
//     let userData = await Users.findOne({_id:req.user.id});
//     userData.cartData[req.body.itemId].q +=1;
//     userData.cartData[req.body.itemId].size.push(req.body.sizeId);
//     userData.cartData[req.body.itemId].color.push(req.body.colorId);
//     await Users.findByIdAndUpdate({_id:req.user.id},{cartData:userData.cartData});
//     res.send("Added")
// })

//creating end point for add profile photo
// app.post('/addprofilephoto',fetchUser,async (req,res)=>{
//     console.log("dpAdded",req.body.itemId);
//     let currentUser = await Users.findOne({_id:req.user.id});
//     currentUser.profile_pic = req.body.profile_pic;
//     await Users.findByIdAndUpdate({_id:req.user.id},{profile_pic:currentUser.profile_pic});
//     res.send("dpAdded")
// })

//creating endpoint for change password
// app.post('/changepassword',fetchUser,async (req,res)=>{
//     console.log("changed");
//     let userData = await Users.findOne({_id:req.user.id});
//     userData.password = req.body.password;
//     await Users.findByIdAndUpdate({_id:req.user.id},{password:userData.password});
//     res.send({success:true})
// })


//creating end point to remove product from cartdata
// app.post('/removefromcart',fetchUser,async (req,res)=>{
//     console.log("removed",req.body.itemId);
//     let userData = await Users.findOne({_id:req.user.id});
//     if(userData.cartData[req.body.itemId].q>0)
//     userData.cartData[req.body.itemId].q -=1;
//     delete userData.cartData[req.body.itemId].size[req.body.sizeId];
//     delete userData.cartData[req.body.itemId].color[req.body.sizeId];//both are equal positions
//     await Users.findByIdAndUpdate({_id:req.user.id},{cartData:userData.cartData});
//     res.send("Removed")
// })
//////////////////////////////////////////////////////////////////////////////////////////////////

//creating end point to remove all  products from cartdata
// app.post('/removeallfromcart',fetchUser,async (req,res)=>{
//     console.log("Allremoved",req.body.itemId);
//     let userData = await Users.findOne({_id:req.user.id});
//     if(userData.cartData[req.body.itemId].q>0)
//     userData.cartData[req.body.itemId].q =0;
//     userData.cartData[req.body.itemId].size =[];
//     userData.cartData[req.body.itemId].color =[];
//     await Users.findByIdAndUpdate({_id:req.user.id},{cartData:userData.cartData});
//     res.send("Removed")
// })

////////////////////////////////////////////////////////////////////////////////////////////////////

//creating endpoint to get cart data
// app.post('/getcart',fetchUser,async (req,res)=>{
//     console.log("GetCart");
//     let userData = await Users.findOne({_id:req.user.id});
//     if(userData){
//         res.json(userData.cartData);
//     }
// })

///////////////////////////////////////////////////////////////

//creating API for get user

// app.post('/getuser',fetchUser,async (req,res)=>{
//     console.log("GetUser");
//     let userEmail = await Users.findOne({_id:req.user.id});
//     res.json(userEmail.email);
// })

//creating API for get user by email///////////////////////////////////////////////////////////////////////////////////////////

// app.post('/getuserbymail', fetchUser, async (req, res) => {
//     console.log("GetUser By Mail");
//     // Use projection to exclude the password field from the result
//     let user = await Users.findOne({_id:req.user.id}, {password: 0});
//     res.json(user);
// });

// Image Storage Engine for slips


// const storage_slip = multer.memoryStorage();
// const upload_slip = multer({ storage: storage_slip });

// Creating upload endpoint for images
// app.post("/slipupload", upload_slip.single('order'), async (req, res) => {
//     const file = req.file;
//     if (!file) {
//         return res.status(400).send("No file uploaded.");
//     }

//     const filename = `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`;
//     const contentType = file.mimetype;

//     try {
//         const url = await getPutObjectSignedUrl2(filename, contentType);
//         // Here you would typically upload the file to S3 using the signed URL.
//         // This is a simplified example:
//         const uploadParams = {
//             Bucket: "moramerch",
//             Key: `slipfiles/${filename}`,
//             Body: file.buffer,
//             ContentType: contentType,
//         };
//         await s2Client.send(new PutObjectCommand(uploadParams));

//         res.json({
//             success: 1,
//             image_url: `https://moramerch.s3.eu-north-1.amazonaws.com/slipfiles/${filename}`
//         });
//     } catch (error) {
//         console.error("Error uploading file to S3", error);
//         res.status(500).send("Error uploading file to S3");
//     }
// });






// const storage_slip = multer.diskStorage({
//     destination: './slipupload/slipimages',
//     filename:(req, file, cb)=>{
//         return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)

//     }
// })

// const upload_slip = multer({storage:storage_slip})

//Creating Upload Endpoint for slip images

// app.use('/slipimages',express.static('slipupload/slipimages'))

// app.post("/slipupload", upload_slip.single('order'),(req,res)=>{
//     res.json({
//         success:1,
//         image_url: `http://localhost:${port}/slipimages/${req.file.filename}`
//     })
// })

// schema for admin
const Admin = mongoose.model("Admin", {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    }
});

// Endpoint for admin login
app.post('/adminlogin', async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Find admin by email
      const admin = await Admin.findOne({ email });
      if (!admin) {
        return res.status(400).json({ success: false, errors: "Wrong Email" });
      }
  
      // Compare passwords
      const passCompare = await bcrypt.compare(password, admin.password);
      if (!passCompare) {
        return res.status(400).json({ success: false, errors: "Wrong Password" });
      }
  
      // Generate JWT token
      const data = {
        admin: {
          id: admin.id,
        }
      };
      const token = jwt.sign(data, process.env.JWT_SECRET, { expiresIn: '1h' });
  
      res.json({ success: true, token });
    } catch (error) {
      res.status(500).json({ success: false, errors: "Internal Server Error" });
    }
});

  // Function to create hardcoded admins
const createAdmins = async () => {
    try {
      const admins = [
        {
          email: "poopooshop13@gmail.com",
          username: "ShopAdmin",
          password: "poo123#@shop", // Plain text password
        },
        {
          email: "admin2@example.com",
          username: "BisonAdmin",
          password: "bison@321", // Plain text password
        }
      ];
  
      for (const admin of admins) {
        // Check if the admin already exists
        const existingAdmin = await Admin.findOne({ email: admin.email });
        if (!existingAdmin) {
          // Hash the password
          const hashedPassword = await bcrypt.hash(admin.password, 10);
  
          // Create the admin
          const newAdmin = new Admin({
            email: admin.email,
            username: admin.username,
            password: hashedPassword,
          });
  
          await newAdmin.save();
          console.log(`Admin ${admin.username} created successfully.`);
        } else {
          console.log(`Admin with email ${admin.email} already exists.`);
        }
      }
    } catch (error) {
      console.error("Error creating admins:", error);
    }
};

const authenticateAdmin = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).json({ error: "Access denied. No token provided." });
    }

    try {
        // Verify token
        const data = jwt.verify(token, process.env.JWT_SECRET);
        req.user = data.admin;
        next();
    } catch (error) {
        console.error('Invalid token:', error.message);
        return res.status(401).json({ error: "Invalid token. Please authenticate again." });
    }
};

// Route to fetch admin details
app.get('/admindetails', authenticateAdmin, async (req, res) => {
    try {
        // Find admin by ID and exclude the password
        const admin = await Admin.findById(req.user.id).select('-password');
        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }

        // Respond with admin details
        res.status(200).json(admin);
    } catch (error) {
        console.error('Server error:', error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// schema for creating Orders

const Order = mongoose.model("Order",{
    id:{
        type: Number,
        required: true,
    },
    email:{
        type: String,//this is email of the user
        required:true,
    },
    whatsApp:{
        type:String,
        required: true,
    },
    phoneNumber:{
        type:String,
        required: true,
    },
    products: [
        {
            product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },  // ObjectId reference
            quantity: { type: Number, required: true },
        },
    ],
    date:{
        type:Date,
        default:Date.now,
    },
    time:{
        type:String,
        default: () => new Date().toLocaleTimeString(),
    },
    total:{
        type:Number,
        required: true,
    },
    firstName:{
        type:String,
        required:true,
    },
    lastName:{
        type:String,
        required:true,
    },
    address: {
        houseNumber: {
            type: String,
        },
        addressLine1: {
            type: String,
        },
        addressLine2: {
            type: String,
        },
        city: {
            type: String,
        },
        district: {
            type: String,
        },
        province: {
            type: String,
        },
        postalCode: {
            type: String,
        },
    },
    isFinish:{
        type:Boolean,
        default:false,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    isCancelled: {
        type: Boolean,
        default: false,
    },
})

app.get('/orders/unread', async (req, res) => {
    try {
        const unreadOrders = await Order.find({ isRead: false }).populate({
            path: 'products.product_id', 
            select: 'name category new_price old_price image',
        });
        res.json(unreadOrders);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark orders as read
app.post('/orders/mark-read', async (req, res) => {
    const { orderId } = req.body; // Extract orderId from the request body

    if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required' });
    }

    try {
        await Order.updateOne({ _id: orderId }, { $set: { isRead: true } });
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/orderconfirmation', async (req, res) => {
    try {
        // Fetch existing orders to generate the next order ID
        let orders = await Order.find({});
        let id;
        if (orders.length > 0) {
            let last_order = orders[orders.length - 1];
            id = last_order.id + 1;
        } else {
            id = 1;
        }

        const address = {
            houseNumber: req.body.houseNumber,
            addressLine1: req.body.addressLine1,
            addressLine2: req.body.addressLine2,
            city: req.body.city,
            district: req.body.district,
            province: req.body.province,
            postalCode: req.body.postalCode,
        };

        // Validate the address fields
        if (!address.city || !address.district || !address.province || !address.postalCode) {
            return res.status(400).json({ success: false, message: "Invalid address information" });
        }

        // Map over the products array to get the ObjectId for each product
        const productsWithObjectIds = [];
        const productDetails = await Promise.all(req.body.products.map(async (product) => {
            // Find the product by its `id` (the one passed in the order)
            const productDoc = await Product.findOne({ id: product.product_id });

            if (!productDoc) {
                return res.status(400).json({ success: false, message: `Product with id ${product.product_id} not found` });
            }

            // Push the product with its `ObjectId` and quantity to the products array
            productsWithObjectIds.push({
                product_id: productDoc._id,  // Use the ObjectId of the product
                quantity: product.quantity,
            });

            // Return product details for mailing purposes
            return {
                name: productDoc.name,
                new_price: productDoc.new_price,
                quantity: product.quantity,
                total: product.quantity * productDoc.new_price // Calculate total for each product
            };
        }));

        // Create the order with the updated structure for products
        const order = new Order({
            id: id,
            email: req.body.email,
            whatsApp: req.body.whatsApp,
            phoneNumber: req.body.phoneNumber,
            products: productsWithObjectIds,  // Now includes products with ObjectIds
            total: req.body.total,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            address: address,
        });

        // Save the order
        await order.save();
        console.log("Order Saved");

        // Fetch product details for each product in the order
        // let productDetails = await Promise.all(req.body.products.map(async (product) => {
        //     let productData = await Product.findOne({ id: product.product_id });
        //     return {
        //         name: productData.name,
        //         new_price: productData.new_price,
        //         quantity: product.quantity,
        //         total: product.quantity * productData.new_price // Calculate total for each product
        //     };
        // }));

        // Construct the product description for the email
        let productDescription = productDetails.map(product => {
            return {
                item: product.name,
                description: `You have ordered ${product.quantity} of this product at a price of ${product.new_price}`,
                total: product.total
            };
        });

        /** Sending an email upon order confirmation */
        let config = {
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD
            }
        };

        let transporter = nodemailer.createTransport(config);

        let MailGenerator = new Mailgen({
            theme: 'default',
            product: {
                name: 'Poo Poo Shop',
                link: 'https://mailgen.js/'
            }
        });

        let response = {
            body: {
                name: req.body.firstName,
                intro: "Your bill has arrived!",
                table: {
                    data: productDescription // Use the array of products for the email table
                },
                outro: 'Thank you for ordering from us!'
            }
        };

        let mail = MailGenerator.generate(response);

        let message = {
            from: process.env.EMAIL,
            to: req.body.email,
            subject: 'Order Confirmation',
            html: mail
        };

        // Send the email
        transporter.sendMail(message, (err, info) => {
            if (err) {
                console.error("Error sending email:", err);
            } else {
                console.log("Email sent:", info.response);
            }
        });

        // Respond to the client
        res.json({
            success: true,
            user_id: req.body.email,
        });

    } catch (error) {
        console.error("Error processing order:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process order",
            error: error.message
        });
    }
});

// app.get('/allorders',async (req, res)=>{
//     let orders = await Order.find({});
//     orders = orders.reverse();
//     console.log("All Orders Fetched");
//     res.send(orders);
// });

app.get('/orders', async (req, res) => {
    try {
        const { isFinished, isCancelled } = req.query;
        let filter = {};

        if (isFinished !== undefined) {
            if (isFinished === 'true') {
                filter.isFinish = true;
            } else if (isFinished === 'false') {
                filter.isFinish = false;
            } else {
                return res.status(400).json({ success: false, message: "Invalid value for isFinished. It must be 'true' or 'false'." });
            }
        }

        if (isCancelled !== undefined) {
            if (isCancelled === 'true') {
                filter.isCancelled = true;
            } else if (isCancelled === 'false') {
                filter.isCancelled = false;
            } else {
                return res.status(400).json({ success: false, message: "Invalid value for isCancelled. It must be 'true' or 'false'." });
            }
        }

        // Special handling for "pending" orders
        if (isFinished === 'false' && isCancelled === undefined) {
            filter.isCancelled = false; // Explicitly exclude cancelled orders
        }

        const orders = await Order.find(filter)
            .populate({
                path: 'products.product_id',
                select: 'name category new_price old_price image',
            })
            .sort({ date: -1 });

        console.log(
            isFinished === undefined
                ? "All Orders Fetched"
                : `${isFinished === 'true' ? "Finished" : "Unfinished"} Orders Fetched`
        );

        res.send(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ success: false, message: "An error occurred while fetching orders" });
    }
});

app.put('/orders/:id', async (req, res) => {
    try {
      const { id } = req.params; // Extract the order ID from the URL
      const { isFinish, isCancelled } = req.body; // Extract the isFinish and isCancelled values from the request body
  
      // Validate input
      if (typeof isFinish !== "boolean" || typeof isCancelled !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "Invalid input: isFinish and isCancelled must be boolean values.",
        });
      }
  
      // Update the order's isFinish and isCancelled fields
      const updatedOrder = await Order.findByIdAndUpdate(
        id, // Match the order by `_id`
        { isFinish, isCancelled },
        { new: true } // Return the updated document
      );
  
      // If no order is found, return an error
      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }
  
      console.log(
        `Order ${id} updated: isFinish set to ${isFinish}, isCancelled set to ${isCancelled}`
      );
      res.status(200).json({
        success: true,
        message: "Order status updated successfully",
        order: updatedOrder,
      });
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while updating the order status",
      });
    }
  });  

app.get('/orders/product/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required",
            });
        }

        // Fetch orders that include the specified product_id
        const orders = await Order.find({
            "products.product_id": productId, // Filter for orders containing the product_id
        })
        .populate({
            path: 'products.product_id',
            select: 'name category new_price old_price image', // Select relevant product fields
        })
        .sort({ date: -1 }); // Sort orders by date in descending order

        // if (!orders.length) {
        //     return res.status(404).json({
        //         success: false,
        //         message: `No orders found for product ID: ${productId}`,
        //         orders: [],
        //     });
        // }

        console.log(`Orders fetched for product ID: ${productId}`);
        return res.status(200).json({
            success: true,
            message: `Orders found for product ID: ${productId}`,
            orders,
        });
    } catch (error) {
        console.error("Error fetching orders for product:", error.message);
        return res.status(500).json({
            success: false,
            message: "An error occurred while fetching orders for the product",
        });
    }
});



//creating endpoint for getting orders by product id
//shold pass product id in request
// app.post('/getordersusingid', async (req,res)=>{
//     let orders = await Order.find({product_id:req.body.product_id});
//     console.log("Get that product orders");
//     res.json(orders);
// })

//creating endpoint for getting orders of a user
// app.post('/getordersofuser', async (req,res)=>{
//     let orders = await Order.find({uder_id:req.body.uder_id});
//     console.log("Get that user's order");
//     res.json(orders);
// })

// Creating API for deleting orders by product id

app.post('/removeorder', async(req, res)=>{
    let orders = await Order.find({product_id:req.body.product_id});
    for(i=0;i<orders.length;i++){
        await Order.findOneAndDelete({product_id:req.body.product_id});
    }
    console.log("Removed");
    res.json({
        success:true,
        product_id:req.body.product_id
    })
})


///////////////////////////////////////////////////////////////////////////////////////////////

const Advertisements = mongoose.model("Adverticements", {
    adid:{
        type: String,
        required: true,
    },
    ad_image:{
        type: String,
    },
    ad_category:{
        type: String,
    }
})

app.post('/addAdertisement', async(req, res)=>{

    let adds = await Advertisements.find({});
    let id;
    if(adds.length>0)
    {
        let last_add_array = adds.slice(-1);
        let last_add = last_add_array[0];
        id = last_add.id+1;
    }
    else{
        id=1;
    }

    const add = new Advertisements({
        adid:id,
        ad_image:req.body.ad_image,
        ad_category: req.body.ad_category,
    })

    await add.save();

    res.json({
        success:true,
        name:req.body.name,
    });
})

//creating endpoint for get all advertisements

app.get('/alladvertisements',async (req, res)=>{
    let adds = await Advertisements.find({});
    adds = adds.reverse();
    console.log("All Advertisements Fetched");
    res.send(adds);
})

// Mongoose model for FundRaising
// const FundRaising = mongoose.model("FundRaising", {
//     amount: {
//         type: Number,
//         default: 0,
//     },
//     donators: {
//         type: Number,
//         default: 0,
//     },
// });

// API to get the FundRaising document
// app.get('/fundraising123', async (req, res) => {
//     try {
//         const fundraising = await FundRaising.findOne(); // Assuming there's only one document
//         if (!fundraising) {
//             return res.status(404).send('FundRaising document not found');
//         }
//         res.json(fundraising);
//     } catch (error) {
//         res.status(500).send(error.toString());
//     }
// });

// API to update the FundRaising document
// app.post('/fundraising123', async (req, res) => {
//     const { amount, donators } = req.body;
//     try {
//         // Assuming there's only one document, so we use findOneAndUpdate with an empty filter
//         const updatedFundRaising = await FundRaising.findOneAndUpdate({}, { $set: { amount, donators } }, { new: true, upsert: true }); // upsert: true creates the document if it doesn't exist
//         res.json({
//             success:true,
//         });
//     } catch (error) {
//         res.status(500).send(error.toString());
//     }
// });

app.get("/api/data", (req, res) => {
    const data = [
        { label: "January", value: 30 },
        { label: "February", value: 20 },
        { label: "March", value: 50 },
    ];
    res.json(data);
});

app.listen(port, (error)=>{
    if(!error){
        console.log("Server Running on Port ",port)
    }
    else{
        console.log("Error : ",error)
    }
})
