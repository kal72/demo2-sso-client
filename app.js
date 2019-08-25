var express = require('express')
var app = express()
var randomstring = require("randomstring");
var cookieSession = require('cookie-session')
const axios = require('axios');
var FormData = require('form-data');


var clientId = "2e8c131643ef460b"
var clientSecret = "3f3687e7784e41b5a4f1618c8db642bb"
var redirectUri = "https://demo2sso.herokuapp.com/callback"
var responseType = "code"
var state = ""
var scope = "all"
var grantType = "authorization_code"
var tokenUrl = "https://racksso.herokuapp.com/api/v1/oauth2/token"
var userInfo = "https://racksso.herokuapp.com/api/v1/userinfo"
var responseToken

const PORT = process.env.PORT || 3001

function authorizeUrl(pState){
  return "https://racksso.herokuapp.com/oauth2/authorize?client_id="+clientId+"&redirect_uri="+redirectUri+"&response_type="+responseType+"&scope="+scope+"&state="+pState
}
 
app.set('view engine', 'pug')
app.use(cookieSession({
  name: 'csid',
  keys: ['!secret!@#'],
}))
app.use('/static', express.static('public'))

app.get('/', function (req, res) {
  if (req.session.loginstate == undefined){
    res.redirect(302, '/login')
  }else{
    var token = req.session.token
    console.log(token)

    axios.create({headers: {'Authorization': 'Bearer '+token.access_token}}).get(userInfo)
    .then(function (response) {
      var data = {
        token: token,
        data : response.data
      }
      
      res.render('index', data)
    })
    .catch(function (error) {
      console.log(error.message);
      return res.status(400).send("application error. \n to get parameter from auth server")
    });
  }  
})
app.get('/login', function (req, res) {
  if (req.session.loginstate != undefined){
    res.redirect(302, '/')
  }

  res.render('login', { loginDashboard: '/auth/dashboard' })
})

app.get('/auth/dashboard', function (req, res) {
  state = randomstring.generate(7)
  res.redirect(302, authorizeUrl(state))
})

app.get('/callback', function (req, res) {
  var qCode = req.query.code
  var qState = req.query.state
  console.log("code: ", qCode)
  console.log("state: ",qState)
  if (qState == state && qCode != undefined){
    var formData = new FormData()
    formData.append('grant_type', grantType)
    formData.append('client_id', clientId)
    formData.append('client_secret', clientSecret)
    formData.append('redirect_uri', redirectUri)
    formData.append('code', qCode)
    formData.append('scope', scope)

    axios.create({headers: formData.getHeaders()}).post(tokenUrl, formData)
    .then(function (response) {
      req.session.loginstate=state
      console.log(JSON.stringify(response.data));
      responseToken = response.data
      state = null
      req.session.token = responseToken
      console.log(responseToken)
      res.redirect(302, '/')
    })
    .catch(function (error) {
      console.log(error.message);
      return res.status(400).send("application error. \n to get parameter from auth server")
    });
  } else{
    res.status(400).send("application error. \n to get parameter from auth server")
  }
})

app.get('/logout', function (req, res) {
  req.session = undefined
  
  res.redirect(302, '/login')
})
 
console.log('start in port '+PORT)
app.listen(PORT)
