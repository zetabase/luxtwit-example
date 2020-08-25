// ============================= 
// LUXTWIT ZETABASE EXAMPLE CODE
// (c) 2020 Zetabase
// ============================= 

// `zb` shell commands to set up user groups:
// 1. create sys text ""
// 2. put sys subusers/testgroup1/token/1 token1
// 3. put sys subusers/testgroup1/maxnum 100

// Shell command for creating table (jasonpy1/jasonpy1 account):
// create tweets json "user read testgroup1,user append testgroup1 uid @uid ts @time" uid lex ts natural


// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// WARNING:
// 
// These variables should be replaced with YOUR Zetabase user information. 
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const PARENT_USER_ID = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"; // Your Zetabase user ID (automatically assigned at signup)
const SUBUSER_GROUP_ID = "testgroup1"; // The name of the subuser group you use for this app 
const SUBUSER_GROUP_TOKEN = "token1"; // The signup token for the subuser group you use for this app
const TWEETS_TABLE_ID = "tweets"; // The name of the table we made for this app

// These are global variables for storing information about the logged in user.
var currentUser = undefined; // To store user information (global state)
var currentClient = undefined; // To store our client (global state)

$(document).ready(function(){

  // ==================== 
  // SIGNUP FUNCTIONALITY
  // ==================== 

  $('#submit-signup').click(function(){
    // Get form values
    let signupHandle = $('#signup-id').val();
    let signupEmail = $('#signup-email').val();
    let signupMobile = $('#signup-mobile').val();
    let signupPass = $('#signup-pass').val();

    // Print form values
    console.log(`Signing up user: ${signupHandle} (${signupEmail} / ${signupMobile})`);
    
    // Call new subuser function with our parent ID, user group info, and signup information 
    Zb.newSubUser(PARENT_USER_ID, signupHandle, signupEmail, signupMobile, signupPass, SUBUSER_GROUP_TOKEN, SUBUSER_GROUP_ID, function(res, err) {
      if(res) {
        // Set globals and show the form for confirming a mobile number 
        currentUser = {"id": res, handle: signupHandle};
        console.log(`Current user: ${JSON.stringify(currentUser)}`);
        $('#confirm-code').show();
      } else {
        $('#signup-feedback').html(`Error: ${JSON.stringify(err.message)}`);
      }
    });
  });

  $('#submit-code').click(function(){
    // Get signup confirmation code and submit to verify user account
    let code = $('#signup-code').val();
    console.log(`Sending up signup code: ${code}`);
    // Submit confirmation code to server to verify user account
    Zb.confirmNewSubUser(PARENT_USER_ID, currentUser.id, code, function(res, err) {
      console.log(`User confirmed: ${currentUser.id}`);
    })
  });


  // ===================== 
  // SIGN IN FUNCTIONALITY
  // ===================== 

  $('#submit-signin').click(function(){
    // Get form values
    let signinHandle = $('#signin-id').val();
    let signinPass = $('#signin-pass').val();

    console.log(`Signing in with ${signinHandle} / ${signinPass}`);

    // Connect to Zetabase as a subuser (application-level user)
    Zb.connectSub(PARENT_USER_ID, signinHandle, signinPass, function(cli, err) {
      if(cli){
        $('#signin-feedback').html(""); // Clear any error messages ...
        // ... and set the global state.
        currentClient = cli;
        currentUser = {"id": cli.userId, handle: signinHandle};
        console.log(`Logged in user: ${JSON.stringify(currentUser)}`)
      } else {
        $('#signin-feedback').html(`Error: ${JSON.stringify(err.message)}`);
      }
    });
  });


  // ========================= 
  // VIEW TWEETS FUNCTIONALITY
  // ========================= 

  setInterval(function(){
    // Only pull tweets when a user is logged in
    if(currentClient) {
      // Calculate the UNIX timestamp for one hour ago in nanoseconds
      let minTs = JSON.stringify(((new Date()).getTime() - (60*60*1000)) * 1000000);
      console.log(`Looking up tweets since: ${new Date(minTs/1000000)}`)
      // Create a Zetabase query object for the given minimum timestamp 
      let qry = Zb.gt("ts", minTs);
      // Run Zetabase query
      Zb.query(currentClient, TWEETS_TABLE_ID, qry, function(res, err){
        if(!err) {
          console.log(`Query returned: ${JSON.stringify(res)}`);
          // Convert to HTML and update page 
          let html = renderTweets(res);
          $('#content').html(html);
        } else {
          console.log(`Query error returned: ${JSON.stringify(err)}`);
        }
      })
    } else {
      console.log("."); // Do nothing! User is not logged in.
    }
  }, 5000);


  // ========================= 
  // SEND TWEETS FUNCTIONALITY
  // ========================= 

  $('#submit-tweet').click(function(){
    // Make sure user is logged in and has typed a tweet
    if(!currentClient) {
      alert("Please log in first.");
      return;
    }
    let txt = $('#tweet-text').val();
    if(txt.length == 0) {
      alert("Please enter a tweet.")
      return;
    }

    // Create a key and a value to insert
    let tweet = {"uid": currentUser.id, "text": txt};
    let key = `tweet/${currentUser.id}/${(new Date()).getTime()}`;
    console.log(`Putting tweet data in key ${key}: ${JSON.stringify(tweet)}`);
    
    // Do the insert!
    Zb.put(currentClient, TWEETS_TABLE_ID, key, JSON.stringify(tweet), function(res, err) {
      // Update UI based on result
      if(err) {
        $('#content').html(`Error: ${err.message}`);
      } else {
        console.log(`Successfully inserted tweet ${key}.`)
        $('#tweet-text').val('');
      }
    });
  });
});


// ===================== 
// RENDER TWEETS AS HTML 
// ===================== 

function renderTweets(dataRaw) {
  let html = "<ol>";
  for(let k in dataRaw) {
    let raw = dataRaw[k];
    let tweet = JSON.parse(raw);
    let d = new Date(tweet.ts / 1000000); // Convert nanosecond timestamp to Date
    html += "<li class=\"tweet-text\">" + d.toLocaleString() + ": " + tweet.text + "</li>"; 
  }
  html += "</ol>";
  return html;
}

