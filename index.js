const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

const dynamoTable = "ttmi-sessions"

const successfullResponse = {
    statusCode: 200,
    body: 'everything is fine'
};

exports.handler = (event, context, callback) => {
    if (event.requestContext.eventType == 'CONNECT') {
        if (typeof event.queryStringParameters === "undefined") {
            callback(null, { statusCode: 401, })
        }
        else {
            var authToken = event.queryStringParameters.auth
            //This is the auth token for desktop app
            if(authToken == "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InR0bWkiLCJpYXQiOjE1ODA0NTA4MjIsImV4cCI6MTYxNjQ1MDgyMn0.Ku3mfPUAO8J_aUjihunxp5FQ8hOd5B50KPVNFX7TqAI"){
                 const connectionId = event.requestContext.connectionId;
                    addToken(authToken,'Sender', connectionId).then(() => {
                        callback(null, successfullResponse);
                    });
            }
            
            
            
            getRecord(authToken).then((record, err) => {
                if (err) {
                    console.log("has error")
                    console.log(err)
                    callback(null, { statusCode: 500, message: "Something went wrong in getting the db records" })
                }
                if (record.Count > 0) {
                    console.log("RECORD")
                    console.log(record)
                      var account = record.Items[0]
                    if(typeof account.connectionId === "undefined" ){
                        const connectionId = event.requestContext.connectionId;
                    // var type = "receiver"
                    // if (typeof event.queryStringParameters === "undefined") {
                    //     callback(null, { statusCode: 401, })
                    // }
                    // else {
                    //     if (event.queryStringParameters.type == "producer") {
                    //         type = "producer"
                    //     }
                    //     else {
                    //         type = "receiver"
                    //     }
                    // }
                    updateToken(authToken, connectionId).then(() => {
                        callback(null, successfullResponse);
                    });
                    }
                    else{
                         callback(null, { statusCode: 401, body:"Body", message:"message" })
                    }
                    


                }
                else {
                    callback(null, { statusCode: 401, })
                }
            })

        }

    }
    else if (event.requestContext.eventType == 'DISCONNECT') {
        console.log("DISCONNECTED")
        const connectionId = event.requestContext.connectionId;
        getConnections().then((data, err) => {
            if (err) {
                console.log(err)
                callback(null, { statusCode: 500, message: "Something went wrong in getting the db records" })
            }

            data.Items.forEach(function(connection) {
                console.log("Connection " + connection.connectionId)
                if (typeof connection.connectionId === "undefined") {

                }
                else {
                    if (connectionId == connection.connectionId) {
                        disconnectToken(connection.authToken).then(() => {
                            callback(null, { statusCode: 200, })
                        });
                    }
                }
            });
        })
    };
}

function updateToken(token, connectionId) {
    const params = {
        TableName: dynamoTable,
        Key: { "authToken": token },
        UpdateExpression: "set connectionId=:p",
        ExpressionAttributeValues: {
            ":p": connectionId,
        },
        ReturnValues: "UPDATED_NEW"
    };

    return ddb.update(params).promise();
}


function disconnectToken(token) {
    return ddb.delete({
        TableName: dynamoTable,
        Key: { authToken: token, },
    }).promise();
}


function getRecord(tkn) {
    console.log("getting record")
    var params = {
        TableName: dynamoTable,
        KeyConditionExpression: "authToken = :t",
        ExpressionAttributeValues: {
            ":t": tkn,
        }
    };
    return ddb.query(params).promise()
}

function getConnections() {
    return ddb.scan({ TableName: dynamoTable }).promise();

}

function addToken(token, username, connectionId) {
    return ddb.put({
        TableName: dynamoTable,
        Item: {
            authToken: token,
            username: username,
            connectionId: connectionId
        },
    }).promise();
}
