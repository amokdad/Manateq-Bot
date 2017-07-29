var restify = require('restify');
var builder = require('botbuilder');
var https = require('https');
var cognitiveservices = require('botbuilder-cognitiveservices');
var nodemailer = require('nodemailer');

Q = require('q');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
    userWelcomeMessage: 'User Welcome Message Works!',
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = new builder.UniversalBot(connector,{
    localizerSettings: { 
        defaultLocale: "en" 
    }
});

// ------------------------------ Recognizers ------------------------------
var ArabicRecognizers = {
        investRecognizer : new builder.RegExpRecognizer( "Invest", /^(مستثمر|إستثمار|أريد أن استثمر)/i),
        greetingRecognizer : new builder.RegExpRecognizer( "Greeting", /^(السلام عليكم|صباح الخير|مساء الخير|مرحباً)/i),
    }

var recognizer = new builder.LuisRecognizer("https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/0cfcf9f6-0ad6-47c3-bd2a-094f979484db?subscription-key=13b10b366d2743cda4d800ff0fd10077&timezoneOffset=0&verbose=true&q=");
var QnaRecognizer = new cognitiveservices.QnAMakerRecognizer({
	knowledgeBaseId: "83feeddc-ec61-4bd8-88b7-255b451c86ac", 
    subscriptionKey: "5721988f51b24dc9b2fa7bf95bb6b7c9"});
// ------------------------------ End Recognizers ------------------------------   

var intents = new builder.IntentDialog({ recognizers: [recognizer, 
    QnaRecognizer,
    ArabicRecognizers.investRecognizer,
    ArabicRecognizers.greetingRecognizer] 
})
.matches('Greeting',(session, args) => {
    if(session.conversationData.lang == null)
    {
        session.beginDialog("setLanguage");
    }
    else
    {
    session.beginDialog("welcome");
    }
})
.matches('Invest',(session, args) => {
    if(session.conversationData.lang == null)
    {
        session.beginDialog("setLanguage");
    }
    else{
    session.beginDialog("invest");
    }
})
.matches('None',(session, args) => {
    if(session.conversationData.unknown != null){
        session.send("cannotUnderstand");
        session.conversationData.unknown++;
    }
    else{
        session.send("cannotUnderstand");
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
        questionBeforeGenericHelp : 1,
        EmailTemplate : {
            Content:{
                en:"Dear {{user}} <br/> Thanks alot for your interest in investing in Manateq, our team will study your inquiry and will get back to you as soon as possible",
                ar:"عزيزي {{user}} <br/> شكراً على اهتمامك بالاستثمار في مناطق، سوف نقوم بدراسة طلبك والرد عليك بأقرب فرصة ممكنة"
            },
            Subject:{
                en:"Thanks from Manateq",
                ar:"شكراً من مناطق"
            }
        },
        YesNo : {
            en:"Yes|No",
            ar:"نعم|كلا"
        }
    },
    Options:{
        Zones: {
            en:{
                "Ras Bufontas":{Description:"Ras Bufontas"},
                "Ym Alhaloul":{Description:"Ym Alhaloul"},
                "I’m not sure":{Description:"I’m not sure"}
            },
            ar:{
                "راس أبوفنطاس":{Description:"راس أبوفنطاس"},
                "أم الهلول":{Description:"أم الهلول"},
                "لست متأكد":{Description:"لست متأكد"}
            }
        },
        Sectors: {
            en:{
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
            ar:{
                "الأتصالات وتكنولوجيا المعلومات (الأجهزة، البرمجيات، وسائل الأعلام الحديثة)":{Description:"الأتصالات وتكنولوجيا المعلومات (الأجهزة، البرمجيات، وسائل الأعلام الحديثة)"},
                "الآليات":{Description:"الآليات"},
                "الأمداد والتجهيز/النقل":{Description:"الأمداد والتجهيز/النقل"},
                "البلاستيكيات (سلع النهائية والوسيطة)":{Description:"البلاستيكيات (سلع النهائية والوسيطة)"},
                "الصناعات الدوائية/التكنولوجية الحيوية/علم الحياة":{Description:"الصناعات الدوائية/التكنولوجية الحيوية/علم الحياة"},
                "الصناعات الهندسية والبنى الأساسية (بستثناء المتعاقدين الرئيسيين والفرعيين)":{Description:"الصناعات الهندسية والبنى الأساسية (بستثناء المتعاقدين الرئيسيين والفرعيين)"},
                "الطيران/الصناعات الجوية":{Description:"الطيران/الصناعات الجوية"},
                "العربات (التصنيع الخفيف والثقيل بمافي ذلك الأجزاء)":{Description:"العربات (التصنيع الخفيف والثقيل بمافي ذلك الأجزاء)"},
                "المعادن (سلع النهائية والوسيطة)":{Description:"المعادن (سلع النهائية والوسيطة)"},
                "بيع الجملة/التوزيع/التجاري/التجزئة":{Description:"بيع الجملة/التوزيع/التجاري/التجزئة"},
                "تجهيز المواد الغذائية والمشروبات":{Description:"تجهيز المواد الغذائية والمشروبات"},
                "تكنولوجيا إعادة التجديد / الأستدامة":{Description:"تكنولوجيا إعادة التجديد / الأستدامة"},
                "خدمات النفط والغاز":{Description:"خدمات النفط والغاز"},
                "خدمات حرفية/أعمال/تجارية":{Description:"خدمات حرفية/أعمال/تجارية"},
                "خدمات ومعدات الرعاية الصحية":{Description:"خدمات ومعدات الرعاية الصحية"},
                "غير ربحية/مجتمع مدني/حكومي/شبه حكومي":{Description:"غير ربحية/مجتمع مدني/حكومي/شبه حكومي"},
                "معدات الكهربائية":{Description:"معدات الكهربائية"},
                "معدات النفط والغاز":{Description:"معدات النفط والغاز"},
                "مواد البناء (بما في ذلك الخضراء / المتوافقة مع مفهوم الأستدامة)":{Description:"مواد البناء (بما في ذلك الخضراء / المتوافقة مع مفهوم الأستدامة)"}
            }
        },
        Operations: {
            en:{
                "Assembly facility":{Description:"Assembly facility"},
                "Call Center":{Description:"Call Center"},
                "Corporate / Reginoal HQ":{Description:"Corporate / Reginoal HQ"},
                "Maintenance & Repair Facility":{Description:"Maintenance & Repair Facility"},
                "Marketing / Sales Office":{Description:"Marketing / Sales Office"},
                "Production facility":{Description:"Production facility"},
                "Training Facility":{Description:"Training Facility"},
                "Warehouse / Distribution Center":{Description:"Warehouse / Distribution Center"}
            },
            ar:{
                "مرافق الأنتاج":{Description:"مرافق الأنتاج"},
                "مرافق التجميع":{Description:"مرافق التجميع"},
                "مرافق التدريب":{Description:"مرافق التدريب"},
                "مرافق الصيانة والأصلاح":{Description:"مرافق الصيانة والأصلاح"},
                "مركز الأتصال":{Description:"مركز الأتصال"},
                "مركز التخزين / التوزيع":{Description:"مركز التخزين / التوزيع"},
                "مقر الشركة المحلي / الأقليمي":{Description:"مقر الشركة المحلي / الأقليمي"},
                "مكاتب التسويق / المبيعات":{Description:"مكاتب التسويق / المبيعات"}
            }
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
        },
        Languages:"العربية|English"
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
                if(session.conversationData.language == null){
                    session.beginDialog("setLanguage");
                }
            },
            function(session,results){
                if(session.conversationData.name == null){
                    builder.Prompts.text(session,"askForEmail");
                }
                else{
                    session.send("greetingAgain",session.conversationData.name)
                }
            },
            function(session,results){
                var name = results.response;
                session.conversationData.name = name;
                session.endDialog("greetingAsk",name);
            }
        ]);
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
                builder.Prompts.text(session,"getMobileNumber");
               
            },
            function(session,results){ //get zone
                session.dialogData.mobile = results.response;
                var zones = program.Helpers.GetOptions(program.Options.Zones,session.preferredLocale());
                builder.Prompts.choice(session, "getZones", zones,{listStyle: builder.ListStyle.button});
            },
            function(session,results){ //get sector
                session.dialogData.zone = results.response;
                var sectors = program.Helpers.GetOptions(program.Options.Sectors,session.preferredLocale());
                builder.Prompts.choice(session, "getSectors", sectors,{listStyle: builder.ListStyle.button});
            },
            function(session,results){ //get operation
                session.dialogData.sector = results.response;
                var operations = program.Helpers.GetOptions(program.Options.Operations,session.preferredLocale());
                //نوع العمل الذي ترغب بتأسيسة
                builder.Prompts.choice(session, "getOperations", operations,{listStyle: builder.ListStyle.button});
            },
            function(session,results){ //get how you heard about us
                session.dialogData.operation = results.response;
                builder.Prompts.text(session, "getHowYouHeard");
            },
            function(session,results){ //get comment
                session.dialogData.heard = results.response;
                builder.Prompts.text(session, "addComment");
            },
            function(session,results){ // end
                session.dialogData.comment = results.response;
                //Send Email
                program.Helpers.SendEmail({email:session.dialogData.email,user:session.dialogData.name},session.preferredLocale());
                builder.Prompts.text(session, "thanksInquiry",session.dialogData.email);
                session.endDialog();
            }
        ]);
        bot.dialog("getname",[
            function(session){ //get girst name
                if(session.conversationData.name == null){
                    builder.Prompts.text(session,"firstNamePlease");
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
                    builder.Prompts.text(session, "validEmail");
                } else {
                builder.Prompts.text(session, "enterEmail");
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
                builder.Prompts.choice(session, "maybeinInvestor",program.Constants.YesNo[session.preferredLocale()],{listStyle: builder.ListStyle.button});
            },
            function(session,results){
                var result = results.response.index;
                if(result == 0){
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
        ]);
        bot.dialog("setLanguage",[
            function(session){
                builder.Prompts.choice(session, "selectYourLanguage",program.Options.Languages,{listStyle: builder.ListStyle.button});
            },
            function(session,results){
               var locale = program.Helpers.GetLocal(results.response.index);
               session.conversationData.lang = locale;
               session.preferredLocale(locale);
               session.send("welcome");
               session.endDialog();
            }
        ])
    },
    Helpers: {
        GetLocal : function(val){
            return val == "1" ? "en" : "ar";
        },
        GetOptions : function(option,locale){
            return option[locale];
        },
        SendEmail : function(data,locale){
            var html = program.Constants.EmailTemplate.Content[locale];
            var subject = program.Constants.EmailTemplate.Subject[locale];
            html = html.replace("{{user}}",data.user);
            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'rattazataom@gmail.com',
                    pass: '!!xuloloL'
                }
            });
            var mailOptions = {
                from: 'rattazataom@gmail.com',
                to: data.email,
                subject: subject,
                html: html,
                
            };
            transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
            });
        }
    } 
 
}

program.Init();

bot.on('conversationUpdate', function (activity) {  
    if (activity.membersAdded) {
        activity.membersAdded.forEach((identity) => {
            if (identity.id === activity.address.bot.id) {
                var reply = new builder.Message()
                    .address(activity.address)
                    .text('Welcome to manateq, how can i help you - أهلاً وسهلاً، كيف يمكنني مساعدتك');
                bot.send(reply);
            }
        });
    }
});


app.get(/.*/, restify.serveStatic({ 'directory': '.', 'default': 'index.html' }));




