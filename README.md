
# 📮Email responder

A Node.js app that is able to respond to emails sent to your Gmail mailbox while you’re out on a vacation 🚞🚵🏻‍♂️ (or not in the mood of responding😅).


## 💻 Technologies & Libraries

**Node.js:** The code is written in JavaScript and runs on the Node.js runtime environment. Node.js allows you to run JavaScript code outside of a web browser, making it suitable for server-side applications.

**Google APIs Node.js Client:**  The googleapis package is used to interact with the Gmail API. It provides a convenient way to authenticate user with Google APIs and make API requests.

**Gmail API:** The Gmail API allows developers to access and manipulate Gmail mailbox data programmatically. It provides a set of RESTful endpoints to perform actions such as retrieving messages, sending emails, and managing labels.

**Buffer.from:** The Buffer.from method is a built-in Node.js method that converts a string or data into a Buffer object. It is used in the code to convert the email message into a Buffer for base64 encoding.

**Base64 Encoding:** Base64 encoding is used to convert the email message into a format that can be included in the raw field when sending a message using the Gmail API. It ensures that the email message is properly encoded and transmitted.

## 📝 Note

* To run this code, you have to create a project in Google Cloud Platform and don't forget to enable the required APIs. 
* The app is coded in most simplified manner and it might need additional libraries and technologies in the production environment for error handling, logging, configuration management, etc. to make this application more robust.
## 🚀 Scope of Improvement

Here are few areas in which this application can be improved:

* Aparently, when we make a request to get all the new mails the Gmail API only returns the mail of first page (each page has 100 mails) and in this app we are just checking the mails of first page (**Assumption:** user will not have more than 100 unread, personal emails).

* Basically, to get the changes in the mailbox of user there are main 2 mechanisms. Poll-based(Here used) and Pub/Sub mechanism. Pub/Sub mechanisms can be used to give instant reply to the sender as it will update the server each time a new email is received and this will also help us to **reduce the network cost** as in current method we are repeatedly checking the mailbox for the changes.


## Acknowledgements

 - [Google Gmail API Documentation](https://developers.google.com/gmail/api/guides)

