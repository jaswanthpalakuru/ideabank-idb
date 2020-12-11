// jshint esversion:6
// importing required packages
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const ejs = require("ejs");
const mongoose = require("mongoose");
const storage = require('node-sessionstorage');
const md5 = require('md5');
const session=require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const nodemailer = require('nodemailer');
let data;

// connecting mongoose to Server
mongoose.connect("mongodb://localhost:27017/userverifyDB",{ useNewUrlParser : true, useUnifiedTopology: true});
mongoose.set('useFindAndModify', false);


var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user:process.env.MAIL_ID,
    pass:process.env.PASSWORD
  }
});




// Schema
const ideaSchema = new mongoose.Schema({
  title : String,
  summary : String,
  description : String},{ minimize: false });
const  userSchema = new mongoose.Schema({
  name : {type:String,required: true},
  // userid : String,
  password : {type:String,required: true},
  mailid : {type:String,required: true},
  mobilenumber : {type:String,required: true},
  ideas : [ideaSchema],
  favIdeas : [ideaSchema],
  userVerified : {type: Boolean}
}, { minimize: false });
const tempUserSchema = new mongoose.Schema({
  mailid : {type:String,required: true},
  otp : {type: String,required: true}
});
// mongoose model
const Idea = mongoose.model("Idea",ideaSchema);
const User = mongoose.model("User",userSchema);
const Tempuser = mongoose.model("Tempuser",tempUserSchema)
// using express
const app = express();
// to set the view engine
app.set('view engine', 'ejs');
// to use bodyParser for post requests
app.use(bodyParser.urlencoded({extended: true}));
// using styles in the public folder
app.use(express.static("public"));


// page renderings
app.get("/",function(req,res){
  res.render("home");
});
app.post("/knowabout",function(req,res){
  res.render("knowabout");
});
app.get("/allideas",function(req,res){
  Idea.find({}, function(err,foundIdeas){
    // console.log(foundIdeas);
    res.render("allideas",{allIdeas: foundIdeas});
  });
});
app.post("/allideas",function(req,res){
  // console.log(storage.getItem("usermail"));
  usermail = storage.getItem("usermail");
  const tit = req.body.postTitle;
  const sum = req.body.postMember;
  const des = req.body.postMember;
  const idea = new Idea({
    title : req.body.postTitle,
    summary : req.body.postMember,
    description : req.body.postBody
  });
  // if(tit.length == 0 || sum.length == 0 || des.length == 0){
  //   res.render("error0",{details: "Please enter all the fields"})
  // }
  // else{
    idea.save();
  // }
  User.findOneAndUpdate({mailid: usermail},
    {$push:{ideas: idea}},
    function(err,data){
    if(err){
      console.log("failed");
    }
    else{
      console.log("Success");
    }
  });
  res.redirect("/allideas");
  });

app.get("/userhome",function(req,res){
  Idea.find({}, function(err,foundIdeas){
    // console.log(foundIdeas);
    res.render("allideas",{allIdeas: foundIdeas});
  });
});
app.post("/userhome",function(req,res){
  // console.log(req.body);
  pass = md5(req.body.password);
  // console.log(pass);
  storage.setItem("usermail",  req.body.email);
  storage.setItem("userpassword", pass);
  usermail = storage.getItem("usermail");
  password = storage.getItem("userpassword");
  User.find({mailid: storage.getItem("usermail")}).exec()
  .then((userdata)=>{
    if((userdata[0].mailid == storage.getItem("usermail")) && (userdata[0].password == storage.getItem("userpassword")) && (userdata[0].userVerified == true))
    {res.redirect("/userhome");}
    else if((userdata[0].mailid != storage.getItem("usermail")) || (userdata[0].password != storage.getItem("userpassword"))){
      res.render("error");
    }
  }).catch((err)=>{
    console.log("error occured bro");
     res.render("error",{details:"  O-o-oh! Something broke." });
  });
 });

 app.get("/home",function(req,res){
   res.render("home");
 })
 app.post("/home",function(req,res){
   res.redirect("/home")
 });
 app.get("/verify",function(req,res){
   res.render("verify");
 });
 app.post("/verify",function(req,res){
   const userverify = storage.getItem("userverify");
   const otp = ""+req.body.otp+"";
   // console.log(userverify);
   // console.log(otp);
   Tempuser.find({mailid : userverify}).exec()
   .then((data)=>{
     // console.log(data);
     if(data[0].otp == otp){
       User.findOneAndUpdate({mailid: data[0].mailid},{$set: {userVerified : true}},function(err){
         if(err){
           console.log(err);
         }
         else{
           console.log("successfully updated the userVerified");
           res.redirect("/home");
         }
       })
   }
   else{
     res.render("error",{details: "Details are wrong"});
   }
   })
   .catch((err)=>{
     console.log(err);
   });
 });
 app.get("/newuser",function(req,res){
   res.render("register");
 });
 app.post("/newuser",function(req,res){
   res.render("register");
 });
app.get("/register",function(req,res){
  res.render("register");
});
app.post("/register",function(req,res){
  const textOtp = rand = Math.floor(100000 + Math.random() * 900000);
  User.find({mailid: req.body.email}).exec()
  .then((data)=>{
    if(data.length != 0){
      res.redirect("/home");
      console.log("already registered");
    }
    else if(data.length == 0){
      storage.setItem("userverify",  req.body.email);
      const user = new User({
        name : req.body.name,
        // userid : "jaswanth123456",
        mailid : req.body.email,
        password :   md5(req.body.password),
        mobilenumber : req.body.mobileNumber,
        // ideas : [idea]
      });
      const tempUser = new Tempuser({
        mailid : req.body.email,
        otp : textOtp
      });
      tempUser.save();
      user.save();
      var mailOptions = {
      from: process.env.mail,
      to: req.body.email,
      subject: 'To verify the user',
      text: ""+textOtp+""
    }
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
        console.log(info);
        transporter.close();
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
      res.redirect("/verify");
      console.log("new user data saved");
    }
  }).catch((err)=>{
      console.log(err);
  });
});

app.get("/useraccountpage",function(req,res){
  storage.getItem("usermail");
  // console.log(storage.getItem("usermail"));
  User.find({mailid: storage.getItem("usermail")}).exec().then((userideas)=>{
    res.render("useraccountpage",{ideas: userideas[0].ideas, userID: storage.getItem("usermail")});
  }).catch((err)=>{
    console.log("cannot load user ideas");
  });
});
app.post("/useraccountpage",function(req,res){
  res.redirect("/useraccountpage");
});

app.get("/compose",function(req,res){
  res.render("compose",{userID: storage.getItem("usermail")});
});
app.post("/compose",function(req,res){
  res.redirect("/compose");
});
app.get("/login",function(req,res){
  res.render("login");
});
app.post("/login",function(req,res){
  // console.log(req.body);
  res.redirect("login");
});
app.get("/forgotpassword",function(req,res){
  res.render("forgotpassword");
});
app.post("/forgotpassword",function(req,res){
  res.redirect("/forgotpassword");
});
app.get("/forgotpassverify",function(req,res){
  res.render("newpasswordverify");
});
app.post("/forgotpassverify",function(req,res){
  // console.log(req.body.email);
  const  userpasschange = storage.setItem("userpasschange",req.body.email);
   const textOtp = rand = Math.floor(100000 + Math.random() * 900000);
   User.find({mailid : req.body.email},function(err,data){
     if(!data){
       console.log("Register first");
     }
     else if(data){
       Tempuser.findOneAndUpdate({mailid : req.body.email},{otp : textOtp},function(err){
         if(err){
           console.log(err);
         }
         else{
           console.log("forgot otp changed successfully");
         }
       })
       var mailOptions = {
       from: process.env.mail,
       to: req.body.email,
       subject: 'To verify the user',
       text: ""+textOtp+""
     }
     transporter.sendMail(mailOptions, function(error, info){
       if (error) {
         console.log(error);
         console.log(info);
         transporter.close();
       } else {
         console.log('Email sent: ' + info.response);
       }
     });
     }
   })
   res.redirect("/forgotpassverify");
});
app.get("/newpassword",function(req,res){
res.render("newpassword");
});
app.post("/newpassword",function(req,res){
// console.log(req.body.otp);
const userpasschange = storage.getItem("userpasschange");
const otp = ""+req.body.otp+"";
// console.log(otp);
// console.log(userverify);
// console.log(otp);
Tempuser.find({mailid : userpasschange},function(err,data){
  // console.log(data);
  if(data[0].otp == otp){
    res.redirect("/newpassword");
  }
});
});
app.get("/verifypassword",function(req,res){
  res.render("newpassword");
});
app.post("/verifypassword",function(req,res){
  const userpasschange = storage.getItem("userpasschange");
  // console.log(userpasschange);
  // console.log(req.body.newpassword);
  // console.log(req.body.confirmnewpassword);
  if(req.body.newpassword == req.body.confirmnewpassword){
    User.update({mailid : userpasschange},{$push:{pasword: 1 },$set:{password: md5(req.body.newpassword)}},{new:true},function(err){
      if(err){
        console.log(err);
      }
      else{
        console.log("successfully changed the password");
      }
    });
    res.redirect("/home");
  }
});
app.get("/deteleIdea",function(req,res){
  res.render("userhome");
});
app.post("/deleteIdea",function(req,res){
  console.log(req.body.ideaID);
  // to delete ideas from ideas collection
  Idea.findOneAndDelete({_id : req.body.ideaID},function(err){
    if(err){
      console.log(err);
    }
    else{
      console.log("successfully deleted the idea");
    }
  });
  // to delete ideas from user-collection
  User.findOneAndUpdate({mailid : storage.getItem("usermail")},{$pull : {ideas : {_id : req.body.ideaID}}},function(err,daat){
    if(err){
      console.log(err);
    }
    else{
      console.log(daat);
    }
  });
  res.redirect("/useraccountpage");
});
app.get("/back",function(req,res){
  res.redirect("/allideas");
});
app.post("/back",function(req,res){
  res.redirect("/allideas");
});




var server = app.listen(process.env.PORT || 5000, function () {
  var port = server.address().port;
  console.log("Express is working on port " + port);
});
