const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// each scope basically allows us to perform some set of operations,
// based on these scopes permissions from end users are asked.
const SCOPES = ['https://mail.google.com/'];
// if you want to change / add some scopes, delete token.js file before executing the code.

// when the code runs for first time, it stores auth token and refresh tokens in token.json file.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

// oAuth credentials for project of Google Cloud Platform.
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// it basically loads the auth token from token.json (if it already exists)
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

// When user logs in for first time, we will store his auth token in token.json
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

// when server starts, in the first step, we authenticate the user.
async function authorize() {

  // if user is already authenticated.
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }

  // if the user is logging in for 1st time
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (client.credentials) {
    await saveCredentials(client);
  }

  return client;
}

// Helping function to create an automated reply!
// This function can't be used to send new mails, it can be only used for replies.
function makeBody(ref, InReply, to, from, subject, message) {
    var str = ["Content-Type: text/plain; charset=\"UTF-8\"\n",
        "MIME-Version: 1.0\n",
        "Content-Transfer-Encoding: 7bit\n",
        "References:", ref, "\n" +
        "In-Reply-To: ", InReply, "\n" +
        "to: ", to, "\n",
        "from: ", from, "\n",
        "subject: ", subject, "\n\n",
        message
    ].join('');

    // Mail has to be in base64 encoding and hence we are converting our message in base64 encoding.
    var encodedMail = Buffer.from(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
    return encodedMail;
}

// This function checks for new (unread) mails and replies to them if the user has not replied to it already.
// it also adds a tag (name: 'replied', id: 'Label_649001856232389286') to each message.
async function checkMails(auth) {
    const gmail = google.gmail({version: 'v1', auth});

    const userId = 'me';
    const labelId = 'Label_649001856232389286';
    const emailId = 'narsinganisagarh@gmail.com';

    // when the server starts for the first time, 
    // we will start replying the mails which were recived an hour ago.
    const afterTime = new Date();
    afterTime.setHours(afterTime.getHours()-1);

    const request = {
        userId,
        labelIds: ['INBOX', 'CATEGORY_PERSONAL', 'UNREAD'], // mails with these labels will be replied only
        q:`after:${Math.floor(afterTime.getTime() / 1000)}` // we will get mails based on this query
    }

    const res = await gmail.users.messages.list(request);
    const messages = res.data.messages;    
    
    // if there are no new messages
    if(!messages){
        console.log('No new Mails');
    } else {
        // here we are fetching all new mails at once and hence if two mails belong to same
        // thread then to keep their track we are using this array here.
        const replied = [];
        messages.forEach(async msg => {
            // get the data of current mail.
            const mail = await gmail.users.messages.get({ userId, id: msg.id });
            // threadId of thread in which current mail belongs
            const threadId = mail.data.threadId;

            // helps when user gets reply from other end...
            const flag = mail.data.snippet.includes(emailId);

            // mail should not be labeled as 'replied' as well as the thread also should not be
            // there in replied array...
            if(!flag && !mail.data.labelIds.includes(labelId) && !replied.includes(threadId)){
                // as we have replied to this thread we push it in the replied array,
                // so that we don't reply to emails belonging to current thread
                replied.push(threadId);

                // Now we create / extract some metadata, which will be afterwards used to send a reply
                const headers = mail.data.payload.headers;
                let subject;
                let to;
                let ref;
                let InReply;
                headers.forEach(element => {
                    if (element.name === 'Subject' || element.name === 'subject') {
                        subject = element.value
                    }
                    if (element.name === 'From' || element.name === 'from') {
                        to = element.value
                    }
                    if (element.name === 'Message-ID' || element.name === 'Message-Id') {
                        ref = element.value
                        InReply = element.value
                    }
                });
                
                // creating a reply message, that we want to send.
                const message = 'Hey there! \nThank you for reaching out, I will get back to you soon. \n\nRegards,\nSagar Narsingani.'
                // Create body for the mail
                var raw = makeBody(ref, InReply, to, 'narsinganisagarh@gmail.com', subject, message);
                
                // send the reply
                await gmail.users.messages.send({
                    userId,
                    requestBody: {
                        raw
                    }
                });

                // add the label of 'replied' to all the mails of current thread.
                await gmail.users.threads.modify({
                    userId,
                    id: mail.data.threadId,
                    requestBody: {
                        'removeLabelIds': [],
                        'addLabelIds': [labelId]
                    }
                });
            } else {
                // incase we encountered a mail, that belongs to a thread in which user has already replied.
                // console.log('Already Replied to thread:', mail.data.threadId);
            }

            // remove the label of unread from the mail
            await gmail.users.messages.modify({
                userId,
                id: msg.id,
                requestBody: {
                    removeLabelIds: ['UNREAD'],
                    addLabelIds: [labelId]
                }
            });
        })
    }

    return;
}

async function listen(auth){
    console.log('Checking the mails...');
    await checkMails(auth).then(_ => console.log('Replied to all unread mails!'));

    // setting a timeout, so that after sometime (random interval), 
    // the server can check for new emails again...
    const lower_lim = 45, upper_lim = 120;
    const interval = Math.floor(lower_lim + Math.random() * (upper_lim-lower_lim+1));
    console.log('Interval:', interval, 'Seconds');
    setTimeout(async () => await listen(auth), interval * 1000)
}

authorize().then(listen).catch(console.error);
