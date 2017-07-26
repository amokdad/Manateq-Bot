var restify = require('restify');
var builder = require('botbuilder');
var https = require('https');
var cognitiveservices = require('botbuilder-cognitiveservices');
Q = require('q');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector);
var recognizer = new builder.LuisRecognizer("https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/0cfcf9f6-0ad6-47c3-bd2a-094f979484db?subscription-key=13b10b366d2743cda4d800ff0fd10077&timezoneOffset=0&verbose=true&q=");
var QnaRecognizer = new cognitiveservices.QnAMakerRecognizer({
	knowledgeBaseId: "83feeddc-ec61-4bd8-88b7-255b451c86ac", 
    subscriptionKey: "5721988f51b24dc9b2fa7bf95bb6b7c9"});
    
var intents = new builder.IntentDialog({ recognizers: [recognizer, QnaRecognizer] })
.matches('Greeting',(session, args) => {

    /*
    program.IntentHelper.GetIntent("Hi").then(
        function(result){
            session.send(result);
        },
        function(err){
            session.send("Error");
        }
    );
    */
    session.beginDialog("welcome");
})
.matches('Invest',(session, args) => {
    session.beginDialog("invest");
})
.matches('None',(session, args) => {
    if(session.conversationData.unknown != null){
        session.send("couldn't get what you are trying to say");
        session.conversationData.unknown++;
    }
    else{
        session.send("couldn't get what you are trying to say");
        session.conversationData.unknown=0;
    }
    if(session.conversationData.unknown >= program.Constants.questionBeforeGenericHelp){
        session.beginDialog("manualHelp");
    }
})
.matches('qna',[
    function (session, args, next) {
            var answerEntity = builder.EntityRecognizer.findEntity(args.entities, 'answer');
            if(session.conversationData.occurance != null){
                session.conversationData.occurance++;
            }
            else{
                session.conversationData.occurance=0;
            }
            if(session.conversationData.occurance >= program.Constants.questionsBeforeInvest){
                session.replaceDialog("wantToInvest");
            }
            else
                session.send(answerEntity.entity);
    }
])

var program = {
    Constants:{
        questionsBeforeInvest : 2,
        questionBeforeGenericHelp : 1
    },
    Options:{
        Zones: {
            "Ras Bufontas":{Description:"Ras Bufontas"},
            "Ym Alhaloul":{Description:"Ym Alhaloul"},
            "I’m not sure":{Description:"I’m not sure"}
        },
        Sectors: {
            "Aviation/Aerospace":{Description:"Aviation/Aerospace"},
            "Constitutions & Engineering (excluding main or subcontractor)":{Description:"Constitutions & Engineering (excluding main or subcontractor)"},
            "Construction Materials (including green/sustainable)":{Description:"Construction Materials (including green/sustainable)"},
            "Electrical equipment":{Description:"Electrical equipment"},
            "Food & Beverage processing":{Description:"Food & Beverage processing"},
            "Healthcare Equipment/Services":{Description:"Healthcare Equipment/Services"},
            "ICT (Hardware, software, new media)":{Description:"ICT (Hardware, software, new media)"},
            "Logistics/Transportation":{Description:"Logistics/Transportation"},
            "Machinery":{Description:"Machinery"},
            "Metals (intermediate and finished goods)":{Description:"Metals (intermediate and finished goods)"},
            "Nonprofit/NGO/Government/Semi-government":{Description:"Nonprofit/NGO/Government/Semi-government"},
            "Oil & Gas Equipment":{Description:"Oil & Gas Equipment"},
            "Oil & Gas Services":{Description:"Oil & Gas Services"},
            "Pharmaceutical/Biotechnology/Life Science":{Description:"Pharmaceutical/Biotechnology/Life Science"},
            "Plastics (intermediate and finished goods)":{Description:"Plastics (intermediate and finished goods)"},
            "Professional/Business/Commercial Services":{Description:"Professional/Business/Commercial Services"},
            "Renewable/Sustainable Technology":{Description:"Renewable/Sustainable Technology"},
            "Vehicles (light and heavy manufacturing, including components)":{Description:"Vehicles (light and heavy manufacturing, including components)"},
            "Wholesale/Distributor/Trader/Retail":{Description:"Wholesale/Distributor/Trader/Retail"}
        },
        Operations: {
            "Assembly facility":{Description:"Assembly facility"},
            "Call Center":{Description:"Call Center"},
            "Corporate / Reginoal HQ":{Description:"Corporate / Reginoal HQ"},
            "Maintenance & Repair Facility":{Description:"Maintenance & Repair Facility"},
            "Marketing / Sales Office":{Description:"Marketing / Sales Office"},
            "Production facility":{Description:"Production facility"},
            "Training Facility":{Description:"Training Facility"},
            "Warehouse / Distribution Center":{Description:"Warehouse / Distribution Center"}
        },
        ManualHelp:{
            "Location":{ 
                Title:"Location", 
                Description:"please select one of the below locations",
                Items:{
                    "Ras Abu Funtas": {
                        Title:"west bay",
                        Description:"it is in the fourth street blabla"
                    },
                     "Um Al Houl": {
                        Title:"west bay",
                        Description:"it is in the fourth street blabla"
                    }
                }           
            }
        }
    },
    Init : function(){
        program.RegisterDialogs();
        bot.dialog("/",intents);

    },
    IntentHelper:{
        url : "https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/0cfcf9f6-0ad6-47c3-bd2a-094f979484db?subscription-key=13b10b366d2743cda4d800ff0fd10077&timezoneOffset=0&verbose=true&q=",
        GetIntent:function(search){
                var deferred  = Q.defer();
                https.get(program.IntentHelper.url + search, (res) => {
                var body = '';
                res.on('data', (d) => {
                body += d;
                });
                res.on('end', function(){
                    deferred.resolve(body);
                });
                }).on('error', (e) => {
                 deferred.reject(err);
                });
                return deferred.promise;
        }
    },
    RegisterDialogs : function(){

        bot.dialog("welcome",[
            function(session){
                if(session.conversationData.name == null){
                    builder.Prompts.text(session,"Hi, please let me know whats is your name");
                }
                else{
                    session.send("Hi again "  + session.conversationData.name + ", how may i help you?")
                }
            },
            function(session,results){
                var name = results.response;
                session.conversationData.name = name;
                session.endDialog('Hi %s, how may I help you today?',name);
            }
        ]);
        /*
        bot.dialog("question",[
            function(session){
                builder.Prompts.text(session,"Certainly I will be glad to assist you. Which aread would you like to ask about, Special Economic Zones, Logistics Parks or Industrial Zones?");
                bot.dialog('/', basicQnAMakerDialog);
            }
        ]);
        */
        bot.dialog("invest",[
            function(session){ //get girst name
                 session.beginDialog("getname");
            },
            function(session,results){ //get email
                session.dialogData.name = session.conversationData.name;
                session.beginDialog("getEmail");
            },
            function(session,results){ //get mobile
                session.dialogData.email = results.response;
                builder.Prompts.text(session,"Great " + session.dialogData.name + ", May i have your mobile number");
               
            },
            function(session,results){ //get zone
                session.dialogData.mobile = results.response;
                builder.Prompts.choice(session, "Which zone are you more interested in?", program.Options.Zones,{listStyle: builder.ListStyle.button});
            },
            function(session,results){ //get sector
                session.dialogData.zone = results.response;
                builder.Prompts.choice(session, "Please select the sector that best describes your activity.", program.Options.Sectors,{listStyle: builder.ListStyle.button});
            },
            function(session,results){ //get operation
                session.dialogData.sector = results.response;
                builder.Prompts.choice(session, "Please select what type of operation you wish to establish.", program.Options.Operations,{listStyle: builder.ListStyle.button});
            },
            function(session,results){ //get how you heard about us
                session.dialogData.operation = results.response;
                builder.Prompts.text(session, "Last question, can you tell me how you heard about the investment opportunities in Manateq?");
            },
            function(session,results){ //get comment
                session.dialogData.heard = results.response;
                builder.Prompts.text(session, "Great, thanks for your time and for considering investing with Manateq. Would you like to leave any special comments for our Investment Consultant or anything specific you would like to inquire about?");
            },
            function(session,results){ // end
                session.dialogData.comment = results.response;
                builder.Prompts.text(session, "Thanks, we have recorded your Enquiry and one of our consultants will be in touch with you very soon.\n\nA copy of your enquiry has been forwarded to " + session.dialogData.email + ".\n\nIs there anything else that I can help you with?");
            },
            function(session,results){
                session.send("Thank you for visiting our website, have a good day.")
                session.endDialog();
            }
        ]);
        bot.dialog("getname",[
            function(session){ //get girst name
                if(session.conversationData.name == null){
                    builder.Prompts.text(session,"Great, please can I have your full name");
                }
                else{
                    session.endDialog();
                }
            },
            function(session,results){ 
                session.conversationData.name = results.response;
                session.endDialog();
            }
        ]);
        bot.dialog("getEmail",[
            function(session,args){
                if (args && args.reprompt) {
                    builder.Prompts.text(session, "Please enter a valid Email");
                } else {
                builder.Prompts.text(session, "What is your Email?");
                }
            },
            function(session,results)
            {
                var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
                if(re.test(results.response))
                    session.endDialogWithResult(results);
                else
                    session.replaceDialog('getEmail', { reprompt: true });
            }
        ]);
        bot.dialog("wantToInvest",[
            function(session){
                builder.Prompts.choice(session, "I see you are interested in knowing more about the exciting investment opportunities with Manateq. \n\n Would you like to give us some quick details, and we will have one of our investment consultants reach you for a full presentation?","Yes|No");
            },
            function(session,results){
                var result = results.response.entity;
                if(result == "Yes"){
                    session.replaceDialog("invest");
                }
                else{
                    session.send("Okay, Thanks")
                    session.endDialog();
                }
            }
        ]);
        bot.dialog("manualHelp",[
            function(session){
                session.send("we will try to help you manually");
                builder.Prompts.choice(session, "Please select one of the below", program.Options.ManualHelp,{listStyle: builder.ListStyle.button});
            },
            function(session,results){
                var result = program.Options.ManualHelp[results.response.entity];
                session.dialogData.item = result;
                builder.Prompts.choice(session, result.Description, result.Items,{listStyle: builder.ListStyle.button});
            },
            function(session,results){
                var item = session.dialogData.item.Items[results.response.entity];
                session.send(item.Title + "\n\n" +  item.Description);
                session.endDialog();
            },
        ])
    },
 
}

program.Init();

bot.on('contactRelationUpdate', function (message) {
    if (message.action === 'add') {
        var name = message.user ? message.user.name : null;
        var reply = new builder.Message()
                .address(message.address)
                .text("Hello %s... Thanks for adding me.", name || 'there');
        bot.send(reply);
    }
});



    













