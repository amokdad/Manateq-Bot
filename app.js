var restify = require('restify');
var builder = require('botbuilder');
var https = require('https');
var http = require('http');
var cognitiveservices = require('botbuilder-cognitiveservices');
var nodemailer = require('nodemailer');
var request = require('request');
var decode = require('decode-html');
var striptags = require('striptags');
var replaceall = require("replaceall");
Q = require('q');

// Setup Restify Server

var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url); 
});

/*
var server = http.createServer(function (request, response) {
    var queryData = url.parse(request.url, true).query;
    response.writeHead(200, {"Content-Type": "text/plain"});
  
    if (queryData.name) {

      response.end('Hello ' + queryData.name + '\n');
  
    } else {
      response.end("Hello World\n");
    }
});
*/

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
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
        //investRecognizer : new builder.RegExpRecognizer( "WantAR", /(^(?!(متى|كيف|هل|ما هو|ما هي|أين))(?=.*(استثمر|اريد ان استثمر|اريد ان استثمر مع مناطق|أستثمر|اريد ان اصبح مستثمر|أريد ان استثمر مع مناطق|استثمر|إستثمار|مستثمر|أريد أن استثمر|أريد أن أصبح مستثمر)))/i),
        //investRecognizer : new builder.RegExpRecognizer( "WantAR", /(أريد ان استثمر مع مناطق|اريد ان استثمر|اريد ان استثمر مع مناطق|أستثمر|اريد ان اصبح مستثمر|استثمر|إستثمار|مستثمر|أريد أن استثمر|أريد أن أصبح مستثمر)/i),
        investRecognizer : new builder.RegExpRecognizer( "WantAR", /((أريد ان استثمر مع مناطق|اريد ان استثمر|اريد ان استثمر مع مناطق|أستثمر|اريد ان اصبح مستثمر|استثمر|إستثمار|مستثمر|أريد أن استثمر|أريد أن أصبح مستثمر))/i),
        
        //investRecognizer : new builder.RegExpRecognizer( "WantAR", /(مستثمر|إستثمار|أريد أن استثمر)/i),
        greetingRecognizer : new builder.RegExpRecognizer( "Greeting", /(السلام عليكم|صباح الخير|مساء الخير|مرحباً)/i),
        arabicRecognizer : new builder.RegExpRecognizer( "Arabic", /(العربية)/i), 
        englishRecognizer : new builder.RegExpRecognizer( "English", /(English)/i)
}

//var recognizer=  new builder.RegExpRecognizer("Want", /(^(?!(how|how can i|how may i|what|which|when))(?=.*(invest|investment|rent a land|lease a land|investor)))/i);
    
var recognizer = new builder.LuisRecognizer("https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/84d08076-0512-494a-980a-15a7373c53e4?subscription-key=bc421f45233241a4b761db52c6a65292&timezoneOffset=0&verbose=true&q=");
var QnaRecognizer = new cognitiveservices.QnAMakerRecognizer({
	knowledgeBaseId: "83feeddc-ec61-4bd8-88b7-255b451c86ac", 
    subscriptionKey: "5721988f51b24dc9b2fa7bf95bb6b7c9"});
   
// ------------------------------ End Recognizers ------------------------------   

var intents = new builder.IntentDialog({ recognizers: [

    ArabicRecognizers.investRecognizer,
    ArabicRecognizers.greetingRecognizer,
    ArabicRecognizers.arabicRecognizer,
    ArabicRecognizers.englishRecognizer,
    QnaRecognizer,
    recognizer
    ] ,recognizeOrder:"series"
})
.matches("Want",(session,args)=>{

    var msg = session.message.text;
    var isInvestment = program.Helpers.IsInvestmentIntent(args);
    var isquestion = program.Helpers.IsQuestion(msg);
    if(isInvestment && !isquestion){
        if(!session.conversationData.applicationSubmitted)
        {
            session.replaceDialog("wantToInvest");
        }
        else{
            session.replaceDialog("askagain");
        }
    }
    else{
        
         // session.send("dsa" + msg + "dsadsa");
         // session.send(JSON.stringify(args))
          request.post({
            headers: {'content-type' : 'application/json','Ocp-Apim-Subscription-Key':'5721988f51b24dc9b2fa7bf95bb6b7c9'},
            url:     'https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/83feeddc-ec61-4bd8-88b7-255b451c86ac/generateAnswer',
            body:    "{question:'" + msg + "'}"
          }, function(error, response, body){
              /*
            var answer = decode(JSON.parse(body).answers[0].answer).replace("<br/>","\n\n");
            answer = replaceall("<br/>","\n\n",answer);
            answer = striptags(answer);
            session.send(answer);
            session.endDialog();*/
            var answer = JSON.parse(body).answers[0].answer;
            //session.send(JSON.parse(body).answers[0].answer);
            if(answer.indexOf("rtl") != -1)
                answer = "<div dir=\"rtl\">" + answer + "</div>";
            session.send(decode(answer));
            //session.send(decode(JSON.parse(body).answers[0].answer));
          });


        //session.send("cannotUnderstand");;
        //session.endDialog();
    }
})
.matches("WantAR",(session,args)=>{
    var msg = session.message.text;
    var isquestion = program.Helpers.IsQuestionArabic(msg);
    if(!isquestion){
        if(!session.conversationData.applicationSubmitted)
        {
            session.replaceDialog("wantToInvest");
        }
        else{
            session.replaceDialog("askagain");
        }
    }
    else{
        // session.send(JSON.stringify(args))
        request.post({
            headers: {'content-type' : 'application/json','Ocp-Apim-Subscription-Key':'5721988f51b24dc9b2fa7bf95bb6b7c9'},
            url:     'https://westus.api.cognitive.microsoft.com/qnamaker/v2.0/knowledgebases/83feeddc-ec61-4bd8-88b7-255b451c86ac/generateAnswer',
            body:    "{question:'" + msg + "'}"
          }, function(error, response, body){
            var answer = decode(JSON.parse(body).answers[0].answer).replace("<br/>","\n\n");
            answer = replaceall("<br/>","\n\n",answer);
            answer = striptags(answer);
            session.send(answer);
            session.endDialog();
          });
    }
})
.matches('Greeting',(session, args) => {
    session.beginDialog("welcome");
})
/*
.matches('Invest',(session, args) => {
    if(!session.conversationData.applicationSubmitted)
    {
        session.beginDialog("wantToInvest");
    }
    else{
        session.endDialog();
    }
})*/
.matches('None',(session, args) => {
    
    //need to fix the 
    if(session.conversationData.unknown != null){
        
        session.conversationData.unknown++;

        if(session.conversationData.unknown >= program.Constants.questionBeforeGenericHelp){
        session.beginDialog("manualHelp");
        }
        else{
            session.send("cannotUnderstand");
        }
    }
    else{
        session.send("cannotUnderstand");
        session.conversationData.unknown=0;
    }
   
})
.matches('qna',[
    function (session, args, next) {
        session.send("qna");
        var answerEntity = builder.EntityRecognizer.findEntity(args.entities, 'answer');
        session.send(answerEntity.entity);
        if(session.conversationData.occurance != null){
            session.conversationData.occurance++;
        }
        else{
            session.conversationData.occurance=0;
        }
        if(session.conversationData.occurance >= program.Constants.questionsBeforeInvest && !session.conversationData.applicationSubmitted){
            session.replaceDialog("wantToInvest");
        }else{
            session.endDialog();
        }
        
    }
])
.matches('English',(session, args) => {
    session.preferredLocale("en",function(err){
        if(!err){
            session.send("welcomeText");
            session.endDialog();
        }
     });
})

.matches('Arabic',(session, args) => {
    session.preferredLocale("ar",function(err){
        if(!err){
            session.send("welcomeText");
            session.endDialog();
        }
     });
})
var program = {
    Constants:{
        questionsBeforeInvest : 5,
        questionBeforeGenericHelp : 2,
        EmailTemplate : {
            Content:{
                en:"Dear {{user}} <br/> Thanks alot for your interest in investing in Manateq, our team will study your inquiry and will get back to you as soon as possible <br/><table border=1><tr><td>Mobile</td><td>{{mobile}}</td></tr><tr><td>Zone</td><td>{{zone}}</td></tr><tr><td>Sector</td><td>{{sector}}</td></tr><tr><td>Operation</td><td>{{operation}}</td></tr><tr><td>Heard</td><td>{{heard}}</td></tr><tr><td>Comment</td><td>{{comment}}</td></tr></table><br/>Regards,<br/>Manateq Team",
                ar:"<div style='direction:rtl'> عزيزي {{user}} <br/> شكراً على اهتمامك بالاستثمار في مناطق، سوف نقوم بدراسة طلبك والرد عليك بأقرب فرصة ممكنة <br/><br/><table border=1><tr><td>رقم جوالك</td><td>{{mobile}}</td></tr><tr><td>اهتماماتك</td><td>{{zone}}</td></tr><tr><td> قطاع</td><td>{{sector}}</td></tr><tr><td>نوع العمل</td><td>{{operation}}</td></tr><tr><td>كيف سمعت عن شركة مناطق؟</td><td>{{heard}}</td></tr><tr><td>الاستعلام عنه</td><td>{{comment}}</td></tr></table><br/> مع تحيات فريق عمل مناطق</div>"
            },
            Subject:{
                en:"Thanks from Manateq",
                ar:"شكراً من مناطق"
            }
        },
        YesNo : {
            en:"Yes|No",
            ar:"نعم|كلا"
        },
        YesNoMoreInfo : {
            en:"Yes|No|More Info",
            ar:"نعم|كلا|المزيد من المعلومات "
        },
    },
    Options:{
        Zones: {
            en:{
                "Ras Bufontas":{Content:"An area of 4.01 km², situated adjacent to Do​​ha’s new Hamad International Airport, Ras Bufontas is an ideal location for businesses requiring international connectivity",Description:"Ras Bufontas",Image:"https://image.ibb.co/m4NJba/Ras_Abu_Fountas.png"},
                "Ym Alhaloul":{Content:"An area of 34 km², Um Alhoul is perfectly located to facilitate access to the rest of the world via the sea.",Description:"Ym Alhaloul",Image:"https://image.ibb.co/nb0RUv/Um_Al_Houl.png"},
                "Al Karaana":{Content:"Al Karaana is Manateq's third Special Economic Zone. Full information and opportunities to invest in Al Karaana will be available in 2018. Al Karaana will be the overland gateway to GCC markets with its strategic location half way between Doha and Abu Sa​mra on the border of the King​dom of Saudi Arabia. With access to over 100 million customers",Description:"Al Karaana",Image:"https://image.ibb.co/iwPn2F/al_kaarna.png"}
            },
            ar:{
                "راس أبوفنطاس":{Content:"تبلغ مساحة رأس بوفنطاس حوالي 4 كيلو متر مربع، وتقع هذه المنطقة بالقرب من مطار حمد الدولي، وتمتاز بموقعها المثالي للأعمال التي تستدعي التواصل على مستوى دولي",Description:"راس أبوفنطاس",Image:"https://image.ibb.co/m4NJba/Ras_Abu_Fountas.png"},
                "أم الهلول":{Content:"تبلغ مساحة أم الحلول حوالي 43​كيلو مت​​​ر مربع، وتتمتع بموقع مميز يتيح حرية الوصول بسهولة إلى بقية دول العالم عبر البحر",Description:"أم الهلول",Image:"https://image.ibb.co/nb0RUv/Um_Al_Houl.png"},
                "​​الكرعانة":{Content:"الكرعانة هي المنطقة الاقتصادية الخاصة الثالثة لشركة مناطق؛ وستتاح فرص الاستثمار في الكرعانة عام 2018. إن موقع الكرعانة ما بين الدوحة وأبو سمرا على حدود المملكة العربية السعودية سيجعلها البوابة البرية لأسواق دول مجلس التعاون الخليجي.",Description:"​​الكرعانة",Image:"https://image.ibb.co/iwPn2F/al_kaarna.png"}
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
        /*
        ManualHelp:{
            en:{
                "Location":{ 
                    Cards : false,
                    Title:"Location", 
                    Description:"please select one of the below locations",
                    Items:{
                        "Ras Abu Funtas": {
                            Cards : false,
                            Title:"west bay",
                            Description:"An area of 4.01 km², situated adjacent to Do​​ha’s new Hamad International Airport, Ras Bufontas is an ideal location for businesses requiring international connectivity.<br/>Ras Bufontas is set to become an advanced technology and logistics hub for the region, attracting regional and global business, trade, and investment thereby contributing to the Qatari Government’s vision of becoming a SMART nation.<br/>This Zone will provide a vibrant and inspiring workplace. A long-lasting, high-quality, and low-maintenance design includes service hubs, public spaces, land for labour accommodation, utilities access, versatile office and retail space, and our Headquarters.<br/>With the Gulf Region and beyond on ​the doorstep, the world-class infrastructure at Ras Bufontas will help your business to grow both within and outside of Qatar.​​​"
                        },
                        "Um Al Houl": {
                            Cards : false,
                            Title:"west bay",
                            Description:"it is in the fourth street blabla"
                        }
                    }           
                },
                "Working Hours":{
                    Cards : false,
                    Title:"Working Hours", 
                    Description:"please select one of the below",
                    Items:{
                        "Morning": {
                            Cards : false,
                            Title:"Morning",
                            Description:"Sunday: 8:00 - 12:00<br/>Monday: 8:00 - 12:00<br/>Tuesday: 8:00 - 12:00<br/>Wednesday: 8:00 - 12:00<br/>Thursday: 8:00 - 12:00​​​"
                        },
                        "Evening": {
                            Cards : false,
                            Title:"Evening",
                            Description:"Sunday: 2:00 - 8:00<br/>Monday: 2:00 - 8:00<<br/>Tuesday: 2:00 - 8:00<<br/>Wednesday: 2:00 - 8:00<<br/>Thursday: 2:00 - 8:00​​​"
                        }
                    }    
                },
                "Management Team":{
                    Cards : true,
                    Title:"Management Team", 
                    Description:"please select one of the below",
                    Items:{
                        "FAHAD RASHID AL KAABI": {
                            Cards : true,
                            Image: "https://www.manateq.qa/Admin/PublishingImages/MTQICONS/Fahad%20Al%20Kaabi_Chief%20Executive%20Officer.JPG",
                            Title:"FAHAD RASHID AL KAABI",
                            Description:"The Ex-CEO of QPM joined Manateq in 2013 bringing with him over 17 years of wide-ranging work experience in the areas of engineering, project management and top level administration. Prior to being appointed CEO of QPM, he has also had relevant experience in formulating public policy as Manager of the Conservation and Energy Efficiency Department of Qatar General Electricity and Water Corporation (KAHRAMAA). During such time, Mr. Al-Kaabi formulated conservation policies, strategies and rules in conformity with conservation laws, as well as promoted educational awareness for energy conservation in Qatar, ensuring compliance with international and GCC energy conservation guidelines.​Demonstrating a commitment to ongoing learning and development in the workplace, Mr. Al-Kaabi received his Bachelor's degree in Industrial Engineering and another Bachelor's degree in Business Management, both from the University of Miami in the USA. He then received his Master's degree in Project Management from the University of Houston in 2007.In his current capacity as CEO of Manateq, Mr. Al-Kaabi vows to push forward the company's vision of supporting Qatar's economic diversification and competitiveness strategy as contained in Qatar's National Vision 2030 framework.​​​"
                        },
                        "MOHAMMED AL MALKI": {
                            Cards : true,
                            Image: "https://www.manateq.qa/Admin/PublishingImages/MTQICONS/Mohammed%20Al%20Malki.JPG",
                            Title:"MOHAMMED AL MALKI",
                            Description:"Mohammed Hassan Al Malki is the Chief Planning and Business Development at Economic Zone Company – Manateq since 2014, with expertise in developing the company's strategy and business plan, managing marketing activities and communicating with investors and customers. B​efore joining Manateq he worked at Qatar General Electricity & Water Corporation KAHRAMAA for more than ten years straight, acquiring an extensive set of skills before closing an exceptionally prolific time at the company as Head of Strategic Planning Section. Mohammed Hassan Al Malki holds an MBA from University of Leeds and a Bachelor's degree in Mechanical Engineering from University of Qatar. He has also successfully attended various workshops and training courses to develop extra abilities, from 'Balance Scorecard' to 'The Seven Innovation Tools' among others, facts proven by his many achievements throughout his career.​​​"
                        },
                        "HAMAD AL MARRI": {
                            Cards : true,
                            Image: "https://www.manateq.qa/Admin/PublishingImages/MTQICONS/Hamad%20Al%20Marri_Chief%20Projects%20Officer.JPG",
                            Title:"HAMAD AL MARRI",
                            Description:"Chief Projects Officer at Economic Zone Company – Manateq, Hamad J. Al-Marri has a wide range of vital responsibilities; developing and leading the implementation of Major Projects, master plan, design and construction strategies and business plan across all zones; coordinating with Business Development to meet the company strategies; and overseeing project control activities, among other duties.Starting his professional life in 1997, Al-Marri worked at companies all over the world. His vast experience at Snamprogetti (Milan), Hyundai (Seoul), Overseas Bechtel Incorporated and Qatar Petroleum brought him to Manateq in 2013.Al-Marri holds a Bachelor's degree in Mechanical Engineering and an extensive academic background, with more than 30 training programs and courses successfully attended. He had been a member of various Tender Committees such as Maersk Oil Qatar, QP-Shell Petrochemical Project, Dolphin Energy and Total Qatar, and Vice Chairman at CNG Utilization for Local Transportation. Al Marri participated in may local and international conferences, summits and events.​​​"
                        },
                        "HAMAD AL NAIMI": {
                            Cards : true,
                            Image: "https://www.manateq.qa/Admin/PublishingImages/MTQICONS/Hamad%20Al%20Naimi_Chief%20Operations%20officer.JPG",
                            Title:"HAMAD AL NAIMI",
                            Description:"Hamad Al-Naimi has been the Chief Operations Officer of the Economic Zones Company (Manateq) since January 2015 where he is responsible for leading the development and implementation of strategic framework and operating policies for zones. Mr. Al-Naimi is a seasoned operations executive with over 15 years of progressive work experience across diverse organizations in Qatar. Mr. Al-Nami's previous roles in Manateq include Project Director, Al-Karana Zone, and Project Controls & Contracts Director where he was responsible for developing and institutionalizing the project support and corporate procurement framework, policies and procedures.Mr. Al-Naimi's roles, prior to joining Manateq, include General Manager of Engineering & Construction, United Development Company (UDC), where he led the portfolio of mega projects from conception to delivery; later, he was appointed as the Board of Director for one of UDC's subsidiaries; Head of Technical, RasGas Company, where he responsible for managing shared assets with QatarGas and other QP subsidiaries; and lastly Project Manager, RasGas Company and Ashghal, where he was responsible for managing and delivering upon multi-million dollar infrastructure and related projectsMr. Al-Naimi is a Civil Engineering by profession and an active member of the Project Management Institute (PMI), USA -Arabian Chapter. Mr. Al-Naimi is an 'Executive Leadership Program' graduate, from Qatar Leadership Center, and a member of the 'Future CEO Program' in Qatar"
                        },
                        "MOHAMMED AL EMADI": {
                            Cards : true,
                            Image: "https://www.manateq.qa/PublishingImages/Al%20Emadi%203.jpg",
                            Title:"MOHAMMED AL EMADI",
                            Description:"​Chief Administration and Finance Officer at Economic Zone Company – Manateq, Mohammad Lutfalla Al Emadi is currently managing four departments – Human Resources, Finance, Information Technology and General services at Manateq. He has twenty years of extensive and diversified experience in banking, logistics services, real estate development and investment.​Before joining Manateq, Al Emadi held senior positions at Industrial Development Bank, Gulf Warehousing Company, Barwa International Real Estate Investment, and Aspire Katara for Investment.He holds a Bachelor's Degree in Industrial Engineering from Texas A&M – USA and he has also successfully attended various workshops and training courses in leaderships, Management and Finance.​​​"
                        }
                    }   
                }
            },
            ar:{
                "المكان":{ 
                    Cards : false,
                    Title:"المكان", 
                    Description:"الرجاء الاختيار من الأماكن التالية",
                    Items:{
                        "راس أبو فنطاس": {
                            Cards : false,
                            Title:"الدفنة",
                            Description:"​​تبلغ مساحة رأس بوفنطاس حوالي 4 كيلو متر مربع، وتقع هذه المنطقة بالقرب من مطار حمد الدولي، وتمتاز بموقعها المثالي للأعمال التي تستدعي التواصل على مستوى دولي.<br/>تتميز رأس بوفنطاس بكل ما يجعلها مركزاً للتكنولوجيا والخدمات اللوجستية في المنطقة، والقدرة على جذب الأعمال الإقليمية والعالمية، والتبادل التجاري والاستثمارات التي ستحقق خ​طة حكومة دولة قطر في أن تصبح الدولة الذكية.<br/>يعزز استدامة الأعمال ومستوى الجودة الرفيع والكلفة المنخفضة للصيانة، وذلك كونها تحتوي على مراكز وخدمات،والمساحات العامة، ومباني العمال، وخدمات المرافق العامة، وتجهيزات المكاتب والمتاجر، والمقر الرئيسي الخاص بشركة 'مناطق'."
                        },
                        "أم الهلول": {
                            Cards : false, 
                            Title:"الغرافة",
                            Description:"​​تبلغ مساحة رأس بوفنطاس حوالي 4 كيلو متر مربع، وتقع هذه المنطقة بالقرب من مطار حمد الدولي، وتمتاز بموقعها المثالي للأعمال التي تستدعي التواصل على مستوى دولي.<br/>تتميز رأس بوفنطاس بكل ما يجعلها مركزاً للتكنولوجيا والخدمات اللوجستية في المنطقة، والقدرة على جذب الأعمال الإقليمية والعالمية، والتبادل التجاري والاستثمارات التي ستحقق خ​طة حكومة دولة قطر في أن تصبح الدولة الذكية.<br/>يعزز استدامة الأعمال ومستوى الجودة الرفيع والكلفة المنخفضة للصيانة، وذلك كونها تحتوي على مراكز وخدمات،والمساحات العامة، ومباني العمال، وخدمات المرافق العامة، وتجهيزات المكاتب والمتاجر، والمقر الرئيسي الخاص بشركة 'مناطق'."
                        }
                    }           
                },
                "مواعيد العمل":{
                    Cards : false,
                    Title:"مواعيد العمل", 
                    Description:"الرجاء ألإختيار من التالي",
                    Items:{
                        "صباحاً": {
                            Cards : false,
                            Title:"صباحاً",
                            Description:"الأحد : 8:00 - 12:00 <br/>الاثنين : 8:00 - 12:00 <br/>الثلاثاء : 8:00 - 12:00 <br/> الاربعاء : 8:00 - 12:00 <br/>الخميس : 8:00 - 12:00​​​"
                        },
                        "مساءً": {
                            Cards : false,
                            Title:"مساءً",
                            Description:"الأحد : 8:00 - 2:00 <br/>الاثنين : 8:00 - 2:00 <br/>الثلاثاء : 8:00 - 2:00 <br/> الاربعاء : 8:00 - 2:00 <br/>الخميس : 8:00 - 2:00"
                        }
                    }    
                },
                "الفريق الإداري":{
                    Cards : true,
                    Title:"الفريق الإداري", 
                    Description:"الرجاء ألإختيار من التالي",
                    Items:{
                        "فهد راشد الكعبي": {
                            Cards : true,
                            Image: "https://www.manateq.qa/Admin/PublishingImages/MTQICONS/Fahad%20Al%20Kaabi_Chief%20Executive%20Officer.JPG",
                            Title:"فهد راشد الكعبي",
                            Description:"​شغل الكعبي منصب الرئيس التنفيذي لشركة قطر للإدارة المشاريع (QPM) قبل إلتحاقه بشركة المناطق الاقتصادية. يتمتع الكعبي بخبرة واسعة، تصل إلى أكثر من 17 عاما لا سيما في مجال الهندسة، وإدارة المشاريع ، ومستويات الادارة العليا، حيث تقلد عدة مناصب هامة منها مدير ادارة مشاريع المياه ومدير ادارة كفاءة الطاقة بشركة كهرماء، حيث قام السيد الكعبي خلال هذه الفترة بوضع العديد من السياسات والاستراتيجيات المتعلقة بترشيد إستخدام الكهرباء والماء، كما عمل أيضا على زيادة الوعي بأهمية المحافظة على الطاقة في قطر وفق أعلى المعايير الإقليمية والدولية. حصل الكعبي على شهادة البكالوريوس في الهندسية الصناعية وشهادة البكالوريوس في إدارة الأعمال من جامعة ميامي بالولايات المتحدة الأمريكية، وحصل على درجة الماجستير في إدارة المشاريع من جامعة هيوستن عام 2007.يأمل الكعبي، ومن خلال موقعه كرئيس تنفيذي لشركة المناطق الإقتصادية، في أن يساهم في تحقيق رؤية الشركة التي تهدف إلى دعم التنوع والتنافسية والى تسهيل نمو قطاع الشركات والصناعات الصغيرة والمتوسطة في الإقتصاد القطري تماشيا مع رؤية قطر الوطنية 2030​​​"
                        },
                        "محمد العمادي": {
                            Cards : true,
                            Image: "https://www.manateq.qa/PublishingImages/Al%20Emadi%203.jpg",
                            Title:"محمد العمادي",
                            Description:"يشغل السيد محمد لطف الله العمادي منصب رئيس الشؤون الإدارية والمالية في شركة المناطق الاقتصادية ويدير حالياً أربعة أقسام مختلفة وهي قسم الموارد البشرية، وقسم الموارد المالية، وقسم تكنولوجيا المعلومات، وقسم الخدمات. ويتمتّع العمادي بخبرة ودراية واسعة بفضل الخبرات التي اكتسبها خلال العشرين عام الماضية من مجالات وقطاعات مختلفة مثل البنوك والخدمات اللوجستية والتطوير العقاري والإستثمار. فقبل التحاقه بشركة مناطق، شغل العمادي العديد من المناصب الهامة طيلة مسيرته المهنية في العديد من الشركات على غرار بنك التنمية الصناعية، وشركة الخليج للمخازن، وشركة بروة الدولية للإستثمار العقاري، وشركة أسباير كتارا للإستثمار.​يحمل السيد محمد العمادي بكالوريوس في الهندسة الصناعية من جامعة تكساس إيه اند إم في الولايات المتحده الأمريكيه، كما حصل على العديد من الشهادات من خلال الدورات التدريبية وورش العمل في مجال القياده والإدارة والمحاسبة المالية."
                        },
                        "محمد المالكي": {
                            Cards : true,
                            Image: "https://www.manateq.qa/Admin/PublishingImages/MTQICONS/Mohammed%20Al%20Malki.JPG",
                            Title:"محمد المالكي",
                            Description:"يشغل السيد محمد حسن المالكي منصب رئيس شؤون تطوير وتخطيط الأعمال في شركة المناطق الاقتصادية - مناطق منذ عام 2014. ويتمتّع محمد حسن بدراية واسعة في مجال التخطيط الاستراتيجي والتسويق وتنمية العلاقات وتطوير الأعمال بفضل الخبرات التي اكتسبها من مجالات مختلفة. فقبل انضمامه إلى فريق إدارة مناطق، شغل محمد حسن المالكي منصب رئيس قسم التخطيط الاستراتيجي بالمؤسسة العامة القطرية للكهرباء والماء  وتضمنت مهامه في الإشراف على رسم خارطة الطريق، وتشكيل منتدى التخطيط الاستراتيجي، بالإضافة إلى تحديد الأهداف القصيرة والطويلة المدى للمؤسسة. كما شملت خبرات المالكي السابقة أعمالاً في ميادين مختلفة على غرار تصميم ومراقبة الشبكة الهيدروليكية للمياه فضلاً عن إعداد خطة عمل الشبكة الموزّعة للمياه في .كما يجدر بالذكر أن محمد حسن المالكي يحمل درجة الماجستير في الإدارة من جامعة ليدز ودرجة البكالوريوس في علوم الهندسة الميكانيكية من جامعة قطر. بالإضافة إلى ذلك، التحق المالكي بالعديد من الدورات التدريبية وورشات العمل لتطوير قدراته في إدارة الأعمال والتخطيط الاستراتيجي لا سيما التطبيق العملي ‪'Balance Scorecard'‪ لتحقيق التميز في الأداء، وأيضاً أساليب القيادة لإدارة فعالة، وغيرها العديد من الدورات​​​​"
                        },
                        "حمد النعيمي": {
                            Cards : true,
                            Image: "https://www.manateq.qa/Admin/PublishingImages/MTQICONS/Hamad%20Al%20Naimi_Chief%20Operations%20officer.JPG",
                            Title:"حمد النعيمي",
                            Description:"يشغل السيد حمد راشد النعيمي منصب رئيس شؤون العمليات في شركة المناطق الاقتصادية - مناطق منذ عام 2015، حيث يتولّى مجموعة واسعة من المهام والمسؤوليات منها تطوير وتنفيذ السياسات الاستراتيجية للتشغيل والصيانة لشركة مناطق. وخلال مسيرته المهنية، تولّى النعيمي عدة مناصب هامة أكسبته خبرة ودراية واسعة في العديد من المجالات. فقبل أن يتولّى منصب الرئيس التنفيذي للعمليات، شغل النعيمي العديد من المناصب منها مدير مشروع منطقة الكرعانة الاقتصادية، كما تولّى منصب مدير مراقبة المشاريع والعقود حيث كان يشرف على تنفيذ وتطويّر آليات دعم المشاريع والمشتريات التابعة لها.قبل انضمامه إلى فريق إدارة شركة المناطق الاقتصادية، شغل النعيمي منصب مدير عام الهندسة والانشاءات لدى شركة المتحدة للتنمية، حيث تولى قيادة مجموعة من المشاريع الضخمة من التصميم الى التسليم النهائي كما تم تعيينه عضو مجلس ادارة احدى الشركات التابعه لها، كما تولّى منصب الرئيس الفني لشركة راس غاز، حيث كان يشغل مهمة إدارة المصالح المشتركة مع شركة قطر للغاز والعديد من الشركات التابعة لشركة قطر للبترول. كما كان مسؤولاً عن العديد من المشاريع الضخمة في كل من شركة راس غاز وهيئة الأشغال العامة، حيث تولّى إدارة وتنفيذ مشاريع البنية التحتية. السيد حمد النعيمي حاصل على بكالوريوس في الهندسة المدنية ، كما يملك اكثر من خمسة عشر عاما من الخبره العمليه والادارية وقد تميز بتمتّعه بمهارات قيادية فذة. فهو عضوٌ نشط في معهد إدارة المشاريع الخاصة، والجمعية الأمريكية لإدارة المشاريع - القسم العربي. كما التحق النعيمي بالعديد من الدورات التدريبية والبرامج التأهيلية لتطوير قدراته في إدارة الأعمال والريادة في المشاريع على غرار البرنامج العالمي'الرئيس التنفيذي المستقبلي' في قطر، وبرنامج القيادات التنفيذية من مركز قطر للقيادات."
                        },
                        "حمد المري": {
                            Cards : true,
                            Image: "https://www.manateq.qa/Admin/PublishingImages/MTQICONS/Hamad%20Al%20Marri_Chief%20Projects%20Officer.JPG",
                            Title:"حمد المري",
                            Description:"​انضم المهندس حمد جارالله المري لشركة المناطق الاقتصادية - مناطق بصفته رئيساً لشؤون المشاريع، ويتولّى مجموعة واسعة من المسؤوليات منها تطوير وقيادة المخطّطات الاستراتيجية، ورسم خارطة الطريق الفنية للمشاريع، والتنسيق مع فريق تطوير الأعمال لتنفيذ استراتيجية الشركة، ومراقبة مراحل تشييد وتطوير المشاريع. كما يجدر بالذكر أن المري، وقبل التحاقه بمناطق، بدأ مسيرته المهنية عام 1997 حيث عمل بشركة سنمبروجيتي في ميلان، ومن ثم انتقل إلى العمل في شركة هيونداي في العاصمة سيول، كما عمل بشركة بكتل الأمريكية، ومنها إلى شركة قطر للبترول وصولاً إلى الالتحاق بشركة مناطق عام ٢٠١٣ بعد تجربة مهنية عالمية المستوى.​يحمل المهندس المري البكالوريوس في الهندسة الميكانيكية، وأكثر من ثلاثين شهادةً في العديد من الدورات التدريبية والبرامج التأهيلية والقيادية. التحق المري بالعديد من اللجان أثناء مسيرته المهنية مثل لجنة المناقصات لشركة ميرسك قطر للبترول ومشروع البتروكيماويات التابع لقطر للبترول وشال وشل، وشركة دولفين للطاقة وشركة توتال قطر، فضلاً عن عمله كنائب لرئيس الفريق القائم على أعمال الغاز الطبيعي المضغوط لفائدة النقل العمومي. المهندس/ حمد المري شارك في العديد من المؤتمرات والمناسبات داخل وخارج دولة قطر.​​​"
                        }
                    }   
                }
            }
        },*/
         ManualHelp:{
            en:{
                "Call Us":{ 
                    Title:"Call Us", 
                    Description:"+974 40323333",        
                },
                "Visit Us":{
                    Title:"Visit Us", 
                    Description:"Visit Us",  
                },
                "Ask us to call you back":{
                    Title:"Ask us to call you back", 
                    Description:"please select one of the below",   
                },
                "Ask More Questions":{
                    Title:"Ask More Questions", 
                    Description:"Ask More Questions",   
                }
            },
            ar:{
                "اتصل بنا عبر الهاتف":{ 
                    Title:"اتصل بنا عبر الهاتف", 
                    Description:"+974 40323333",        
                },
                "زرنا في مكاتبنا":{
                    Title:"زرنا في مكاتبنا", 
                    Description:"زرنا في مكاتبنا",  
                },
                "اطلب منا ان نتصل بك":{
                    Title:"اطلب منا ان نتصل بك", 
                    Description:"please select one of the below",   
                },
                "اود طرح المزيد من الاسئلة":{
                    Title:"اود طرح المزيد من الاسئلة",
                    Description:"اود طرح المزيد من الاسئلة",   
                }
            },
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

         bot.dialog("askagain",[
            // function(session){
            //     session.beginDialog("setLanguage");
            // },
            function(session,results){
               builder.Prompts.choice(session, "alreadySubmitted" ,program.Constants.YesNoMoreInfo[session.preferredLocale()],{listStyle: builder.ListStyle.button});
            },
            function(session,results){
                var index = results.response.index;
                if(index==0)
                {
                    session.replaceDialog("invest");
                }
                else if(index == 2)
                    {
                        session.send("investAnswer").endDialog();
                    }
                else{
                    session.endDialog();
                }
            }
        ]);
        bot.dialog("welcome",[
            // function(session){
            //     session.beginDialog("setLanguage");
            // },
            function(session,results){
                if(session.conversationData.name == null){
                    builder.Prompts.text(session,"askForEmail");
                }
                else{
                    session.send("greetingAgain",session.conversationData.name)
                    session.endDialog();
                }
            },
            function(session,results){
                var name = results.response;
                session.conversationData.name = name;
                session.endDialog("greetingAsk",name);
            }
        ])

        bot.dialog("invest",[
            // function(session){ 
            //     session.beginDialog("setLanguage");
            // },
            function(session,args){
                session.beginDialog("getname");    
            },
            function(session,results){ //get email
                session.dialogData.name = session.conversationData.name;
                session.beginDialog("getEmail");
            },
            function(session,results){ //get mobile
                session.dialogData.email = results.response;
                //builder.Prompts.text(session,"getMobileNumber");
                session.beginDialog("getMobile");
            },
            function(session,results){ //get zone
                //session.dialogData.mobile = results.response;
                //var zones = program.Helpers.GetOptions(program.Options.Zones,session.preferredLocale());
                //builder.Prompts.choice(session, "getZones", zones,{listStyle: builder.ListStyle.button});

                session.send("selectoption");
                session.dialogData.mobile = results.response;
                var zones = program.Helpers.GetOptions(program.Options.Zones,session.preferredLocale());

                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var attachments = [];
                var txt = session.localizer.gettext(session.preferredLocale(),"getZones");
                msg.text = txt;
                for(var i in zones)
                {
                    attachments.push(
                         new builder.HeroCard(session)
                        .title(zones[i].Description)
                        .text(zones[i].Content.substring(0,150)+"...")
                        .images([builder.CardImage.create(session, zones[i].Image)])
                        .buttons([
                            builder.CardAction.imBack(session, zones[i].Description, zones[i].Description)
                        ])
                    );
                }
                msg.attachments(attachments);
                builder.Prompts.choice(session, msg, zones);

            },
            function(session,results){ //get sector
                session.dialogData.zone = results.response.entity;
                var sectors = program.Helpers.GetOptions(program.Options.Sectors,session.preferredLocale());
                builder.Prompts.choice(session, "getSectors", sectors,{listStyle: builder.ListStyle.button});
            },
            function(session,results){ //get operation
                session.dialogData.sector = results.response.entity;
                var operations = program.Helpers.GetOptions(program.Options.Operations,session.preferredLocale());
                //نوع العمل الذي ترغب بتأسيسة
                builder.Prompts.choice(session, "getOperations", operations,{listStyle: builder.ListStyle.button});
            },
            function(session,results){ //get how you heard about us
                session.dialogData.operation = results.response.entity;
                builder.Prompts.text(session, "getHowYouHeard");
            },
            function(session,results){ //get comment
                session.dialogData.heard = results.response;
                builder.Prompts.text(session, "addComment");
            },
            function(session,results){ // end
                session.dialogData.comment = results.response;
                
                //Send Email
                program.Helpers.SendEmail({
                    email:session.dialogData.email,
                    user:session.dialogData.name,
                    mobile:session.dialogData.mobile,
                    zone:session.dialogData.zone,
                    sector:session.dialogData.sector,
                    operation:session.dialogData.operation,
                    heard:session.dialogData.heard,
                    comment:session.dialogData.comment
                },session.preferredLocale());
                session.send("thanksInquiry",session.dialogData.email);
                session.conversationData.applicationSubmitted = true;

                session.send("feelfreetoask");
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
        bot.dialog("getMobile",[
            function(session,args){
                if (args && args.reprompt) {
                    builder.Prompts.text(session, "validMobile");
                } else {
                builder.Prompts.text(session, "getMobileNumber");
                }
            },
            function(session,results)
            {
                var re = /[0-9]{8}/;
                if(re.test(results.response))
                    session.endDialogWithResult(results);
                else
                    session.replaceDialog('getMobile', { reprompt: true });
            }
        ]);
        bot.dialog("wantToInvest",[
            // function(session){
            //     session.beginDialog("setLanguage");
            // },
            function(session,results){
                builder.Prompts.choice(session, "maybeinInvestor",program.Constants.YesNoMoreInfo[session.preferredLocale()],{listStyle: builder.ListStyle.button});
            },
            function(session,results){
                var result = results.response.index;
                if(result == 0){
                    session.replaceDialog("invest");
                }
                else if(result == 2)
                {
                    session.send("investAnswer").endDialog();
                }
                else{
                    session.send("thanks");
                    session.conversationData.applicationSubmitted = true;
                    session.endDialog();
                }
            }
        ]);
        bot.dialog("manualHelp",[
            function(session){
                
                session.conversationData.unknown = null;
                var locale = session.preferredLocale();
                builder.Prompts.choice(session, "manualHelpText", program.Options.ManualHelp[locale],{listStyle: builder.ListStyle.button});
            },
            function(session,results){
                var index = JSON.stringify(results.response.index);
                var locale = session.preferredLocale();
                if(index == 0){
                    session.send(program.Options.ManualHelp[locale][results.response.entity].Description).endDialog();
                }
                if(index == 1){
                    session.send("<iframe style='height:300px' src='https://www.google.com/maps/embed/v1/place?key=AIzaSyCLZyAIsCWgtflWwbHCYDSZALUCnftXA-o&q=Qatar+The+Gate+Mall'></iframe>").endDialog();
                }
                //program.Options.ManualHelp[locale]
                if(index == 2){
                    session.replaceDialog("invest");
                }else{
                    session.endDialog();
                }
            }])//.triggerAction({matches: /Main Menu|اللائحة الرئيسية/i});

            bot.dialog("manualHelpMainMenu",[
                function(session){
                    
                    session.conversationData.unknown = null;
                    var locale = session.preferredLocale();
                    builder.Prompts.choice(session, "manualHelpTextMainMenu", program.Options.ManualHelp[locale],{listStyle: builder.ListStyle.button});
                },
                function(session,results){
                    var index = JSON.stringify(results.response.index);
                    var locale = session.preferredLocale();
                    if(index == 0){
                        session.send(program.Options.ManualHelp[locale][results.response.entity].Description).endDialog();
                    }
                    if(index == 1){
                        session.send("<iframe style='height:300px' src='https://www.google.com/maps/embed/v1/place?key=AIzaSyCLZyAIsCWgtflWwbHCYDSZALUCnftXA-o&q=Qatar+The+Gate+Mall'></iframe>").endDialog();
                    }
                    //program.Options.ManualHelp[locale]
                    if(index == 2){
                        session.replaceDialog("invest");
                    }else{
                        session.endDialog();
                    }
                }]).triggerAction({matches: /Main Menu|اللائحة الرئيسية/i});
        /*
        bot.dialog("manualHelp",[
            function(session){
                var locale = session.preferredLocale();
                builder.Prompts.choice(session, "manualHelpText", program.Options.ManualHelp[locale],{listStyle: builder.ListStyle.button});
            },
            function(session,results){
                var locale = session.preferredLocale();
                var result = program.Options.ManualHelp[locale][results.response.entity];
                session.dialogData.item = result;
                if(!result.Cards)
                {
                    
                    builder.Prompts.choice(session, result.Description, result.Items,{listStyle: builder.ListStyle.button});
                }
                else{
                    var msg = new builder.Message(session);
                    msg.attachmentLayout(builder.AttachmentLayout.carousel);
                    var attachments = [];
                    var txt = session.localizer.gettext(session.preferredLocale(),"select");
                    for(var i in result.Items)
                    {
                        attachments.push(
                             new builder.HeroCard(session)
                            .title(result.Items[i].Title)
                            .text(result.Items[i].Description.substring(0,150)+"...")
                            .images([builder.CardImage.create(session, result.Items[i].Image)])
                            .buttons([
                                builder.CardAction.imBack(session, result.Items[i].Title, txt)
                            ])
                        );
                    }
                    msg.attachments(attachments);
                    //session.send(msg);
                    builder.Prompts.choice(session, msg, result.Items);
                }
            },
            function(session,results){
                var item = session.dialogData.item.Items[results.response.entity];
                
                if(item.Cards)
                {
                    var msg = new builder.Message(session);
                    msg.attachmentLayout(builder.AttachmentLayout.carousel);
                    msg.attachments([
                        new builder.HeroHeroCard(session)
                        .title(item.Title)
                        .text(item.Description)
                        .images([builder.CardImage.create(session, item.Image)])
                        //.buttons([
                            //builder.CardAction.imBack(session, item.Title, "Buy")
                        //])
                    ])
                    session.send(msg).endDialog();
                }
                else{
                   session.send(item.Title + "\n\n" +  item.Description);
                   session.endDialog();     
                }
                
            },
        ]);
        */
        bot.dialog("setLanguage",[
            function(session){
                if(session.conversationData.lang == null)
                {
                    builder.Prompts.choice(session, "selectYourLanguage",program.Options.Languages,{listStyle: builder.ListStyle.button});
                }else{
                    session.endDialog();
                }
            },
            function(session,results){
               var locale = program.Helpers.GetLocal(results.response.index);
               session.conversationData.lang = locale;
               session.preferredLocale(locale,function(err){
                   if(!err){
                      session.send("welcome");
                      session.endDialog();
                   }
               });
               
            }
        ]);
        bot.dialog("setLanguageWithPic",[
            function(session){
                
                var msg = new builder.Message(session);
                msg.attachmentLayout(builder.AttachmentLayout.carousel);
                var txt = session.localizer.gettext("en","selectYourLanguage");
                msg.attachments([
                new builder.HeroCard(session)
                    .title("Manateq")
                    .text(txt)
                    .images([builder.CardImage.create(session, "https://www.manateq.qa/Style%20Library/MTQ/Images/logo.png")])
                    .buttons([
                        builder.CardAction.imBack(session, "English", "English"),
                        builder.CardAction.imBack(session, "العربية", "العربية"),
                    ])
                ]);
                builder.Prompts.choice(session, msg, "العربية|English");
            }
            ,
            function(session,results){
               var locale = program.Helpers.GetLocal(results.response.index);
               session.conversationData.lang = locale;
               session.preferredLocale(locale,function(err){
                   if(!err){
                      session.send("welcomeText");
                      session.endDialog();
                   }
               });
               
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
            html = html.replace("{{mobile}}",data.mobile);
            html = html.replace("{{zone}}",data.zone);
            html = html.replace("{{sector}}",data.sector);
            html = html.replace("{{operation}}",data.operation);
            html = html.replace("{{heard}}",data.heard);
            html = html.replace("{{comment}}",data.comment);
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
        },
        IsInvestmentIntent: function(args){
            if(args.entities == null || args.entities.length == 0)
                return false;
            return args.entities[0].entity == "invest" || 
            args.entities[0].entity == "investment" ||
            args.entities[0].entity == "investing" ||
            args.entities[0].entity == "land";
        },
        IsQuestion: function(msg){
            return msg.toLowerCase().indexOf("what type of") != -1 || msg.toLowerCase().indexOf("am i") != -1;
        },
        IsQuestionArabic: function(msg){
            return msg.toLowerCase().indexOf("أين") != -1 
            || msg.toLowerCase().indexOf("ما هو") != -1
            || msg.toLowerCase().indexOf("كيف") != -1
            || msg.toLowerCase().indexOf("متى") != -1
            || msg.toLowerCase().indexOf("ما هي") != -1;
        }
    } 
 
}

program.Init();

bot.on('conversationUpdate', function (activity) {  
    if (activity.membersAdded) {
        activity.membersAdded.forEach((identity) => {
            if (identity.id === activity.address.bot.id) {
                   bot.beginDialog(activity.address, 'setLanguageWithPic');
             }
         });
    }
 });









