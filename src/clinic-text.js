/* ================= Clinic: ⓘ help + Hindi (Devanagari) ================= */
Object.assign(HELP, {
  'c-home': [['Clinic home', 'क्लिनिक होम'],
    ['Today at a glance: appointments, patients still to see, appointment requests, new messages from patients and fees to collect.', 'आज की पूरी झलक: अपॉइंटमेंट, जिन मरीज़ों को अभी देखना है, अपॉइंटमेंट की रिक्वेस्ट, मरीज़ों के नए मैसेज और लेनी बाकी फ़ीस।'],
    [['Tap Book appointment for clinic, video or WhatsApp visits.', 'क्लिनिक, वीडियो या व्हाट्सऐप के लिए “अपॉइंटमेंट बुक करें” दबाएं।'],
     ['Tap a patient in the queue to mark Done and fee received.', 'लाइन में किसी मरीज़ पर टैप करके “हो गया” और “फ़ीस मिली” लगाएं।'],
     ['Send each patient their link once. Their readings and messages then come here by themselves.', 'हर मरीज़ को एक बार उनका लिंक भेजें। फिर उनकी रीडिंग और मैसेज अपने आप यहां आएंगे।']],
    ['Messages and requests from patients also ring on your phone if notifications are on.', 'नोटिफ़िकेशन चालू हों तो मरीज़ों के मैसेज और रिक्वेस्ट आपके फ़ोन पर भी बजते हैं।']],
  'c-queue': [['Today’s queue', 'आज की लाइन'],
    ['All appointments for today, by time. Video calls start from here.', 'आज के सभी अपॉइंटमेंट, समय के हिसाब से। वीडियो कॉल यहीं से शुरू होती है।'],
    [['Tap a name to open the appointment.', 'अपॉइंटमेंट खोलने के लिए नाम पर टैप करें।'], ['Mark Done, Missed or Fee received.', '“हो गया”, “नहीं आए” या “फ़ीस मिली” लगाएं।']]],
  'c-requests': [['Appointment requests', 'अपॉइंटमेंट की रिक्वेस्ट'],
    ['Patients can ask for a date and time from their link. Confirm, and the patient gets a WhatsApp message.', 'मरीज़ अपने लिंक से तारीख और समय मांग सकते हैं। पक्का करें, तो मरीज़ को व्हाट्सऐप मैसेज जाता है।'],
    [['Tap the request.', 'रिक्वेस्ट पर टैप करें।'], ['Tap Confirm & tell patient, or change the time with Edit.', '“पक्का करें और मरीज़ को बताएं” दबाएं, या “बदलें” से समय बदलें।']]],
  patients: [['Patients', 'मरीज़'],
    ['Every patient with their readings, charts, records, photos, voice notes, appointments and fees in one place.', 'हर मरीज़ की रीडिंग, चार्ट, रिकॉर्ड, फ़ोटो, आवाज़ वाले मैसेज, अपॉइंटमेंट और फ़ीस एक जगह।'],
    [['Tap New patient. Only the name is needed.', '“नया मरीज़” दबाएं। सिर्फ़ नाम ज़रूरी है।'], ['Open the patient and tap Patient link to send it on WhatsApp.', 'मरीज़ खोलें और “मरीज़ का लिंक” दबाकर व्हाट्सऐप पर भेजें।'], ['Search by name, mobile or illness.', 'नाम, मोबाइल या बीमारी से खोजें।']]],
  patient: [['Patient page', 'मरीज़ का पेज'],
    ['Health shows charts of BP, sugar, weight and more. Readings shows every number in rows. Records keeps visits, medicines and report photos date-wise. Messages has what the patient sent.', '“सेहत” में बीपी, शुगर, वज़न वगैरह के चार्ट हैं। “रीडिंग” में हर नंबर लाइन में है। “रिकॉर्ड” में विज़िट, दवाइयां और रिपोर्ट की फ़ोटो तारीख के हिसाब से हैं। “मैसेज” में मरीज़ ने जो भेजा वह है।'],
    [['Tap Add reading to save BP, sugar or weight.', 'बीपी, शुगर या वज़न लिखने के लिए “रीडिंग जोड़ें” दबाएं।'], ['Tap Patient link so the patient sends readings, photos and voice notes from home.', '“मरीज़ का लिंक” दबाएं ताकि मरीज़ घर से रीडिंग, फ़ोटो और आवाज़ भेज सके।'], ['Tap the printer on a record to print the prescription.', 'पर्चा छापने के लिए रिकॉर्ड पर प्रिंटर दबाएं।']],
    ['Red or blue numbers are outside the usual adult range. They are only a hint; you decide.', 'लाल या नीले नंबर सामान्य दायरे से बाहर हैं। ये सिर्फ़ इशारा हैं; फ़ैसला आपका है।']],
  'pt-health': [['Health charts', 'सेहत के चार्ट'], ['One chart for each reading over the chosen days. Touch a chart to see the exact number and date.', 'चुने गए दिनों में हर रीडिंग का अलग चार्ट। सही नंबर और तारीख देखने के लिए चार्ट को छुएं।']],
  'pt-readings': [['Readings', 'रीडिंग'], ['Every reading in rows, newest first, with who added it: the clinic or the patient. Download it as Excel / CSV.', 'हर रीडिंग लाइन में, नई सबसे ऊपर, और किसने जोड़ी: क्लिनिक या मरीज़। इसे एक्सेल / CSV में डाउनलोड करें।']],
  'pt-records': [['Medical records', 'मेडिकल रिकॉर्ड'], ['Each visit with problem, diagnosis, medicines, next visit date, report photos and voice notes. Only people you allow can see this.', 'हर विज़िट: परेशानी, जांच, दवाइयां, अगली तारीख, रिपोर्ट की फ़ोटो और आवाज़। इसे सिर्फ़ वही देख सकते हैं जिन्हें आप इजाज़त दें।']],
  'pt-messages': [['Messages', 'मैसेज'], ['What the patient sent from their link: text, photos and voice notes. Reply here; the patient sees it on their link.', 'मरीज़ ने अपने लिंक से जो भेजा: लिखा हुआ, फ़ोटो और आवाज़। यहीं जवाब दें; मरीज़ को अपने लिंक पर दिखेगा।']],
  'pt-fees': [['Visits & fees', 'विज़िट और फ़ीस'], ['All appointments of this patient with the fee and whether it is paid.', 'इस मरीज़ के सभी अपॉइंटमेंट, फ़ीस के साथ, और फ़ीस मिली या नहीं।']],
  appointments: [['Appointments', 'अपॉइंटमेंट'],
    ['Book visits in the clinic, on video call or on WhatsApp call. Requests from patients, fees due and reminders are here too.', 'क्लिनिक, वीडियो कॉल या व्हाट्सऐप कॉल के अपॉइंटमेंट बुक करें। मरीज़ों की रिक्वेस्ट, बाकी फ़ीस और रिमाइंडर भी यहीं हैं।'],
    [['Tap Book appointment and type the patient name. A new name becomes a new patient.', '“अपॉइंटमेंट बुक करें” दबाएं और मरीज़ का नाम लिखें। नया नाम हो तो नया मरीज़ बन जाता है।'], ['For video: tap Start video call. The patient gets the same link.', 'वीडियो के लिए: “वीडियो कॉल शुरू करें” दबाएं। मरीज़ को वही लिंक मिलता है।'], ['Tap Fee reminder to send the patient a WhatsApp with a pay-online link.', 'मरीज़ को ऑनलाइन पेमेंट लिंक के साथ व्हाट्सऐप भेजने के लिए “फ़ीस रिमाइंडर” दबाएं।']],
    ['Video calls use Jitsi Meet, which is free. The first time, sign in with Google when it asks, to start the room.', 'वीडियो कॉल जित्सी मीट से होती है, जो मुफ़्त है। पहली बार रूम शुरू करने के लिए गूगल से साइन इन करें।']],
  'ap-requests': [['Requests', 'रिक्वेस्ट'], ['Appointments patients asked for from their link. Confirm or change the time.', 'मरीज़ों ने अपने लिंक से जो अपॉइंटमेंट मांगे। पक्का करें या समय बदलें।']],
  'ap-fees': [['Fees due', 'बाकी फ़ीस'], ['Fees not received yet, and payments patients say they made by UPI. Check your UPI app, then tap Fee received.', 'जो फ़ीस अभी नहीं मिली, और जो मरीज़ कहते हैं कि UPI से भेज दी। अपना UPI ऐप देखें, फिर “फ़ीस मिली” दबाएं।']],
  'c-settings': [['Clinic settings', 'क्लिनिक की सेटिंग'],
    ['Your clinic name, doctor details, registration number, timings, fees and UPI ID. These show on the patient link and on printed prescriptions.', 'क्लिनिक का नाम, डॉक्टर की जानकारी, रजिस्ट्रेशन नंबर, समय, फ़ीस और UPI आईडी। ये मरीज़ के लिंक और छपे पर्चे पर दिखते हैं।'],
    [['Fill the fee for clinic visit and for video call.', 'क्लिनिक विज़िट और वीडियो कॉल की फ़ीस भरें।'], ['Add your UPI ID so patients can pay online. The money comes straight to you.', 'UPI आईडी डालें ताकि मरीज़ ऑनलाइन फ़ीस दे सकें। पैसा सीधे आपके पास आता है।']]],
  'adm-verify': [['Doctor verification', 'डॉक्टर की जांच'], ['Every doctor uploads a registration certificate at sign-up. Their clinic stays locked until you approve it here.', 'हर डॉक्टर साइन अप पर रजिस्ट्रेशन सर्टिफ़िकेट अपलोड करता है। जब तक आप यहां मंज़ूरी न दें, उनका क्लिनिक बंद रहता है।'],
    [['Open the files and check the number on the council’s website.', 'फ़ाइलें खोलें और काउंसिल की वेबसाइट पर नंबर जांचें।'], ['Tap Approve, or Reject with a reason the doctor will see.', '“मंज़ूर करें” दबाएं, या कारण लिखकर “मना करें”; डॉक्टर को कारण दिखेगा।']]]
});
I18N.load(['c-home', 'c-queue', 'c-requests', 'patients', 'patient', 'pt-health', 'pt-readings', 'pt-records', 'pt-messages', 'pt-fees', 'appointments', 'ap-requests', 'ap-fees', 'c-settings', 'adm-verify']
  .flatMap(k => { const [t, w, steps, tip] = HELP[k]; return [t, w, ...(steps || []), ...(tip ? [tip] : [])]; }).map(([en, hi]) => en + ' | ' + hi).join('\n'));

I18N.load(`
What is your business? * | आपका बिज़नेस क्या है? *
Tent House | टेंट हाउस
Stock, bookings, crew | स्टॉक, बुकिंग, क्रू
Caterer / Halwai | कैटरर / हलवाई
Menu, ration, plates | मेन्यू, राशन, प्लेट
Event Manager | इवेंट मैनेजर
Planning, vendors, setup | प्लानिंग, वेंडर, सेटअप
Doctor / Clinic | डॉक्टर / क्लिनिक
Patients, reports, appointments | मरीज़, रिपोर्ट, अपॉइंटमेंट
Tent, catering and event: pick all that apply. Doctors: pick Doctor / Clinic. | टेंट, कैटरिंग और इवेंट: जो-जो काम करते हैं सब चुनें। डॉक्टर: “डॉक्टर / क्लिनिक” चुनें।
Business name * | बिज़नेस का नाम *
Clinic / hospital name * | क्लिनिक / अस्पताल का नाम *
Clinic / hospital name | क्लिनिक / अस्पताल का नाम
For patient safety we check every doctor. Upload your registration certificate. The app opens after our team approves it, usually within 24 hours. | मरीज़ों की सुरक्षा के लिए हम हर डॉक्टर की जांच करते हैं। अपना रजिस्ट्रेशन सर्टिफ़िकेट अपलोड करें। हमारी टीम की मंज़ूरी के बाद ऐप खुलता है, आमतौर पर 24 घंटे में।
Medical registration number * | मेडिकल रजिस्ट्रेशन नंबर *
Medical council * | मेडिकल काउंसिल *
Medical council | मेडिकल काउंसिल
— Choose — | — चुनें —
National Medical Commission (NMC) | नेशनल मेडिकल कमीशन (एनएमसी)
Rajasthan Medical Council | राजस्थान मेडिकल काउंसिल
Delhi Medical Council | दिल्ली मेडिकल काउंसिल
Maharashtra Medical Council | महाराष्ट्र मेडिकल काउंसिल
Gujarat Medical Council | गुजरात मेडिकल काउंसिल
Uttar Pradesh Medical Council | उत्तर प्रदेश मेडिकल काउंसिल
Madhya Pradesh Medical Council | मध्य प्रदेश मेडिकल काउंसिल
Haryana Medical Council | हरियाणा मेडिकल काउंसिल
Punjab Medical Council | पंजाब मेडिकल काउंसिल
Bihar Medical Council | बिहार मेडिकल काउंसिल
West Bengal Medical Council | पश्चिम बंगाल मेडिकल काउंसिल
Karnataka Medical Council | कर्नाटक मेडिकल काउंसिल
Tamil Nadu Medical Council | तमिलनाडु मेडिकल काउंसिल
Telangana State Medical Council | तेलंगाना स्टेट मेडिकल काउंसिल
Andhra Pradesh Medical Council | आंध्र प्रदेश मेडिकल काउंसिल
Kerala (TCMC) | केरल (टीसीएमसी)
Dental Council (State / DCI) | डेंटल काउंसिल (राज्य / डीसीआई)
AYUSH / Ayurveda / Homoeopathy Board | आयुष / आयुर्वेद / होम्योपैथी बोर्ड
Physiotherapy Council | फ़िज़ियोथेरेपी काउंसिल
Other state council | किसी और राज्य की काउंसिल
Qualification | योग्यता (डिग्री)
Speciality | विशेषज्ञता
General Physician | जनरल फ़िज़िशियन
Diabetologist | डायबिटीज़ विशेषज्ञ
Cardiologist | हृदय रोग विशेषज्ञ
Physiotherapist | फ़िज़ियोथेरेपिस्ट
Paediatrician | बाल रोग विशेषज्ञ
Gynaecologist | स्त्री रोग विशेषज्ञ
Dermatologist | त्वचा रोग विशेषज्ञ
Orthopaedic | हड्डी रोग विशेषज्ञ
ENT | नाक-कान-गला (ईएनटी)
Eye specialist | आंख के डॉक्टर
Dentist | दांत के डॉक्टर
Psychiatrist | मनोरोग विशेषज्ञ
Dietitian | डाइटीशियन
Ayurveda | आयुर्वेद
Homoeopathy | होम्योपैथी
Registration certificate (photo or PDF) * | रजिस्ट्रेशन सर्टिफ़िकेट (फ़ोटो या पीडीएफ़) *
You can add your degree too. Up to 6 files, 10 MB each. | आप अपनी डिग्री भी जोड़ सकते हैं। 6 फ़ाइल तक, हर एक 10 एमबी तक।
e.g. Sharma Clinic | जैसे शर्मा क्लिनिक
e.g. RMC/12345 | जैसे RMC/12345
e.g. MBBS, MD (Medicine) | जैसे MBBS, MD (मेडिसिन)
Write your medical registration number | अपना मेडिकल रजिस्ट्रेशन नंबर लिखें
Choose your medical council | अपनी मेडिकल काउंसिल चुनें
Upload your registration certificate | अपना रजिस्ट्रेशन सर्टिफ़िकेट अपलोड करें
Up to 6 files | 6 फ़ाइल तक
Certificate must be a photo or a PDF | सर्टिफ़िकेट फ़ोटो या पीडीएफ़ होना चाहिए
Each file must be under 10 MB | हर फ़ाइल 10 एमबी से छोटी हो
Pick your business type | अपने बिज़नेस का प्रकार चुनें
Account created. We will check your certificate soon. | अकाउंट बन गया। हम जल्दी आपका सर्टिफ़िकेट जांचेंगे।
One step | बस एक कदम
left | बाकी
: verify you are a doctor. | : बताइए कि आप डॉक्टर हैं।
We are | हम आपका सर्टिफ़िकेट
checking | जांच
your certificate. | रहे हैं।
Patients trust the doctors on SabManage. Upload your medical registration certificate once. After approval you can add patients, appointments and reports. | मरीज़ सबमैनेज के डॉक्टरों पर भरोसा करते हैं। अपना मेडिकल रजिस्ट्रेशन सर्टिफ़िकेट एक बार अपलोड करें। मंज़ूरी के बाद आप मरीज़, अपॉइंटमेंट और रिपोर्ट जोड़ सकते हैं।
Our team checks your registration with the medical council. This usually takes less than 24 hours. You will get a WhatsApp message, and the app opens here by itself. | हमारी टीम मेडिकल काउंसिल से आपका रजिस्ट्रेशन जांचती है। आमतौर पर 24 घंटे से कम लगते हैं। आपको व्हाट्सऐप मैसेज मिलेगा, और ऐप यहीं अपने आप खुल जाएगा।
Verification pending | जांच बाकी है
sent {} | भेजा {1}
Registration no. | रजिस्ट्रेशन नंबर
Council | काउंसिल
Files | फ़ाइलें
Check again | फिर से देखें
Change details or add a file | जानकारी बदलें या फ़ाइल जोड़ें
Send for approval | मंज़ूरी के लिए भेजें
Not approved yet. | अभी मंज़ूरी नहीं मिली।
Sent. We will check it soon. | भेज दिया। हम जल्दी जांचेंगे।
Approved! Welcome to SabManage. | मंज़ूरी मिल गई! सबमैनेज में स्वागत है।
WhatsApp support | व्हाट्सऐप सपोर्ट
Loading… | लोड हो रहा है…
Appointments | अपॉइंटमेंट
Appointment | अपॉइंटमेंट
Patients | मरीज़
Patient | मरीज़
Medical records | मेडिकल रिकॉर्ड
Doctor (Owner) | डॉक्टर (मालिक)
Associate doctor | सहायक डॉक्टर
Receptionist | रिसेप्शनिस्ट
Nurse / Assistant | नर्स / सहायक
Another doctor: patients, records, appointments. | दूसरे डॉक्टर: मरीज़, रिकॉर्ड, अपॉइंटमेंट।
Front desk: appointments, fees, patient list and messages. No medical records. | रिसेप्शन: अपॉइंटमेंट, फ़ीस, मरीज़ों की लिस्ट और मैसेज। मेडिकल रिकॉर्ड नहीं।
Nurse / assistant: adds readings, sees records, helps with patients. | नर्स / सहायक: रीडिंग जोड़ते हैं, रिकॉर्ड देखते हैं, मरीज़ों की मदद करते हैं।
Appointments today | आज के अपॉइंटमेंट
Still to see | अभी देखने हैं
Requests | रिक्वेस्ट
Request | रिक्वेस्ट
New messages | नए मैसेज
Fees to collect | लेनी बाकी फ़ीस
Book appointment | अपॉइंटमेंट बुक करें
Clinic, video or WhatsApp | क्लिनिक, वीडियो या व्हाट्सऐप
New patient | नया मरीज़
Add reading | रीडिंग जोड़ें
BP, sugar, weight… | बीपी, शुगर, वज़न…
Visit / report | विज़िट / रिपोर्ट
Today’s queue | आज की लाइन
All appointments | सभी अपॉइंटमेंट
No appointment today | आज कोई अपॉइंटमेंट नहीं
Book one, or share the patient link so patients can request a time. | अपॉइंटमेंट बुक करें, या मरीज़ों को उनका लिंक भेजें ताकि वे खुद समय मांग सकें।
Patients say they paid | मरीज़ कहते हैं फ़ीस दे दी
Appointment requests | अपॉइंटमेंट की रिक्वेस्ट
New messages from patients | मरीज़ों के नए मैसेज
Clinic profile, fees, UPI and timings | क्लिनिक की जानकारी, फ़ीस, UPI और समय
Clinic profile | क्लिनिक की जानकारी
Shown on the patient link and on printed prescriptions | मरीज़ के लिंक और छपे पर्चे पर दिखता है
Doctor name | डॉक्टर का नाम
Registration number | रजिस्ट्रेशन नंबर
Clinic phone / WhatsApp | क्लिनिक का फ़ोन / व्हाट्सऐप
Clinic timings | क्लिनिक का समय
Fee for clinic visit ₹ | क्लिनिक विज़िट की फ़ीस ₹
Fee for video / WhatsApp call ₹ | वीडियो / व्हाट्सऐप कॉल की फ़ीस ₹
UPI ID for fees | फ़ीस के लिए UPI आईडी
Patients pay straight to this UPI. No fee is cut. | मरीज़ सीधे इसी UPI पर पैसा भेजते हैं। कोई कटौती नहीं।
e.g. Mon–Sat 10 am–2 pm, 5–8 pm. Sunday closed. | जैसे सोम–शनि सुबह 10–दोपहर 2, शाम 5–8। रविवार बंद।
Clinic logo | क्लिनिक का लोगो
Shows on the patient link and prescriptions | मरीज़ के लिंक और पर्चे पर दिखता है
Signature / stamp | हस्ताक्षर / मोहर
Updated clinic settings | क्लिनिक की सेटिंग बदली
Only the name is needed. Add the rest when you like. | सिर्फ़ नाम ज़रूरी है। बाकी जब चाहें भरें।
Edit patient | मरीज़ की जानकारी बदलें
Patient name | मरीज़ का नाम
Patient name * | मरीज़ का नाम *
Mobile (WhatsApp) | मोबाइल (व्हाट्सऐप)
Age | उम्र
Gender | लिंग
Male | पुरुष
Female | महिला
yrs | साल
Illness / reason for care | बीमारी / इलाज का कारण
Allergies | एलर्जी
Allergy | एलर्जी
Readings to track | कौन सी रीडिंग रखनी हैं
These show on the patient’s link and as charts here | ये मरीज़ के लिंक पर और यहां चार्ट में दिखती हैं
Private note | निजी नोट
e.g. Diabetes, high BP | जैसे डायबिटीज़, हाई बीपी
e.g. Penicillin | जैसे पेनिसिलिन
Write the patient name | मरीज़ का नाम लिखें
Choose patient | मरीज़ चुनें
Search name or mobile | नाम या मोबाइल से खोजें
No patients yet | अभी कोई मरीज़ नहीं
Add your first patient. Then send them their link to share daily readings. | अपना पहला मरीज़ जोड़ें। फिर उन्हें लिंक भेजें ताकि वे रोज़ की रीडिंग भेज सकें।
Search name, mobile or illness | नाम, मोबाइल या बीमारी से खोजें
On the patient link | मरीज़ के लिंक पर
{} patients · readings, reports, photos and voice notes in one place | {1} मरीज़ · रीडिंग, रिपोर्ट, फ़ोटो और आवाज़ एक जगह
Last reading | आखिरी रीडिंग
new | नए
Patient link | मरीज़ का लिंक
Health | सेहत
Readings | रीडिंग
readings | रीडिंग
Records | रिकॉर्ड
Messages | मैसेज
Visits & fees | विज़िट और फ़ीस
3 months | 3 महीने
No readings yet | अभी कोई रीडिंग नहीं
No reading yet | अभी कोई रीडिंग नहीं
No reading in this period | इन दिनों में कोई रीडिंग नहीं
Add a reading or ask the patient to send it from their link | रीडिंग जोड़ें या मरीज़ से कहें कि अपने लिंक से भेजें
Add a reading here, or send the patient link so the patient adds BP, sugar and weight daily from home. | यहां रीडिंग जोड़ें, या मरीज़ को लिंक भेजें ताकि मरीज़ घर से रोज़ बीपी, शुगर और वज़न भेजे।
BP | बीपी
Sugar | शुगर
Weight | वज़न
Pulse | नब्ज़
Oxygen (SpO₂) | ऑक्सीजन (SpO₂)
Temperature | बुखार (तापमान)
BP (upper / lower) | बीपी (ऊपर / नीचे)
Sugar (mg/dL) | शुगर (mg/dL)
Fasting | खाली पेट
After food | खाने के बाद
Random | कभी भी
Weight (kg) | वज़न (किलो)
Pulse (/min) | नब्ज़ (/मिनट)
Oxygen (SpO₂) (%) | ऑक्सीजन (SpO₂) (%)
Temperature (°F) | बुखार (°F)
kg | किलो
/min | /मिनट
mmHg | mmHg
mg/dL | mg/dL
Other readings | और रीडिंग
Note (optional) | नोट (ज़रूरी नहीं)
e.g. after walk, felt dizzy | जैसे टहलने के बाद, चक्कर आया
Date & time | तारीख और समय
Save reading | रीडिंग सेव करें
Reading saved | रीडिंग सेव हो गई
Please check | कृपया देखें
Fill at least one reading | कम से कम एक रीडिंग भरें
Fill both BP numbers (upper and lower) | बीपी के दोनों नंबर भरें (ऊपर और नीचे)
The number looks wrong | नंबर गलत लग रहा है
Upper (systolic) | ऊपर वाला (सिस्टोलिक)
Lower (diastolic) | नीचे वाला (डायस्टोलिक)
since {} | {1} से
No change since {} | {1} से कोई बदलाव नहीं
Pay with any UPI app | किसी भी UPI ऐप से दें
↑ {} mmHg | ↑ {1} mmHg
↓ {} mmHg | ↓ {1} mmHg
↑ {} mg/dL | ↑ {1} mg/dL
↓ {} mg/dL | ↓ {1} mg/dL
↑ {} kg | ↑ {1} किलो
↓ {} kg | ↓ {1} किलो
↑ {} /min | ↑ {1} /मिनट
↓ {} /min | ↓ {1} /मिनट
↑ {} % | ↑ {1} %
↓ {} % | ↓ {1} %
↑ {} °F | ↑ {1} °F
↓ {} °F | ↓ {1} °F
Coloured numbers are outside the usual adult range. They are only a quick hint; the doctor decides. | रंगीन नंबर बड़ों के सामान्य दायरे से बाहर हैं। ये सिर्फ़ इशारा हैं; फ़ैसला डॉक्टर करते हैं।
{} readings | {1} रीडिंग
Excel / CSV | एक्सेल / CSV
Date & time | तारीख और समय
By | किसने
Clinic | क्लिनिक
Delete reading | रीडिंग हटाएं
Delete this reading? | यह रीडिंग हटाएं?
Date-wise visits, reports and photos | तारीख के हिसाब से विज़िट, रिपोर्ट और फ़ोटो
No records yet | अभी कोई रिकॉर्ड नहीं
Save each visit with the problem, medicines and photos of reports. Everything stays date-wise. | हर विज़िट को परेशानी, दवाइयों और रिपोर्ट की फ़ोटो के साथ सेव करें। सब कुछ तारीख के हिसाब से रहता है।
Edit visit / report | विज़िट / रिपोर्ट बदलें
Next visit (optional) | अगली विज़िट (ज़रूरी नहीं)
Next visit | अगली विज़िट
Problem / symptoms | परेशानी / लक्षण
Problem | परेशानी
Diagnosis / findings | जांच / बीमारी
Medicines & advice | दवाइयां और सलाह
Add photos or reports | फ़ोटो या रिपोर्ट जोड़ें
Photo | फ़ोटो
Report / file | रिपोर्ट / फ़ाइल
Voice note | आवाज़ भेजें
Stop | रोकें
Print prescription | पर्चा छापें
Save to records | रिकॉर्ड में सेव करें
Write something or add a file | कुछ लिखें या फ़ाइल जोड़ें
Delete this record? | यह रिकॉर्ड हटाएं?
Add your registration number in Settings to print it on prescriptions. | पर्चे पर छापने के लिए सेटिंग में अपना रजिस्ट्रेशन नंबर डालें।
Only photos or PDF | सिर्फ़ फ़ोटो या पीडीएफ़
Up to 5 files in one message | एक मैसेज में 5 फ़ाइल तक
Allow the microphone to record a voice note | आवाज़ रिकॉर्ड करने के लिए माइक की इजाज़त दें
Voice recording is not supported in this browser. Use Chrome. | इस ब्राउज़र में आवाज़ रिकॉर्ड नहीं होती। क्रोम इस्तेमाल करें।
Open full size | पूरे साइज़ में खोलें
Report (PDF) | रिपोर्ट (पीडीएफ़)
Write a reply… | जवाब लिखें…
Send | भेजें
Reply saved. Tell the patient on WhatsApp? | जवाब सेव हो गया। मरीज़ को व्हाट्सऐप पर बताएं?
No messages yet. When the patient sends a problem, photo or voice note from their link, it shows here. | अभी कोई मैसेज नहीं। मरीज़ अपने लिंक से परेशानी, फ़ोटो या आवाज़ भेजेंगे तो यहां दिखेगी।
Send the patient link first. Then the patient can send problems, photos and voice notes here. | पहले मरीज़ को लिंक भेजें। फिर मरीज़ यहां परेशानी, फ़ोटो और आवाज़ भेज सकते हैं।
Send patient link | मरीज़ को लिंक भेजें
Write something, or add a photo or voice note | कुछ लिखें, या फ़ोटो या आवाज़ जोड़ें
This private link opens only this patient’s page: daily readings, problems with photo or voice, appointments and fee. No login or app needed. | यह निजी लिंक सिर्फ़ इसी मरीज़ का पेज खोलता है: रोज़ की रीडिंग, फ़ोटो या आवाज़ से परेशानी, अपॉइंटमेंट और फ़ीस। लॉगिन या ऐप की ज़रूरत नहीं।
Copy link | लिंक कॉपी करें
Stop the old link and make a new one | पुराना लिंक बंद करें और नया बनाएं
Make a new link? | नया लिंक बनाएं?
The old link stops working at once. Use this if the link was shared with the wrong person. | पुराना लिंक तुरंत बंद हो जाएगा। अगर लिंक गलत व्यक्ति के पास चला गया हो तो इसका इस्तेमाल करें।
New link | नया लिंक
In clinic | क्लिनिक में
Video call | वीडियो कॉल
WhatsApp call | व्हाट्सऐप कॉल
In clinic · {} | क्लिनिक में · {1}
Video call · {} | वीडियो कॉल · {1}
WhatsApp call · {} | व्हाट्सऐप कॉल · {1}
Book an appointment with the button above. | ऊपर वाले बटन से अपॉइंटमेंट बुक करें।
In clinic, video call or WhatsApp call. Fees and reminders in one place. | क्लिनिक, वीडियो कॉल या व्हाट्सऐप कॉल। फ़ीस और रिमाइंडर एक जगह।
Upcoming | आने वाले
Fees due | बाकी फ़ीस
Past | पुराने
No requests | कोई रिक्वेस्ट नहीं
No fees due | कोई फ़ीस बाकी नहीं
Nothing here | यहां कुछ नहीं
Patients can ask for an appointment from their link. Requests wait here for you to confirm. | मरीज़ अपने लिंक से अपॉइंटमेंट मांग सकते हैं। रिक्वेस्ट यहां आपकी मंज़ूरी का इंतज़ार करती है।
to collect | लेनी है
Tap a patient to send a reminder or mark paid. | रिमाइंडर भेजने या फ़ीस मिली लगाने के लिए मरीज़ पर टैप करें।
Edit appointment | अपॉइंटमेंट बदलें
Patient name * | मरीज़ का नाम *
Type to search or add new | खोजने या नया जोड़ने के लिए लिखें
How | कैसे
Fee ₹ | फ़ीस ₹
Reason (optional) | कारण (ज़रूरी नहीं)
e.g. BP follow-up | जैसे बीपी की जांच
Book | बुक करें
Appointment booked | अपॉइंटमेंट बुक हो गया
Choose an existing patient | पहले से जुड़ा मरीज़ चुनें
Booked | बुक है
Done | हो गया
Missed | नहीं आए
Cancelled | रद्द
due | बाकी
paid | मिल गई
patient says paid | मरीज़ ने कहा दे दी
{} due | {1} बाकी
{} paid | {1} मिल गई
{} patient says paid | {1} मरीज़ ने कहा दे दी
Start video call | वीडियो कॉल शुरू करें
Send link | लिंक भेजें
Video calls open in Jitsi Meet (free). The first time, the doctor signs in with Google to start the room. | वीडियो कॉल जित्सी मीट में खुलती है (मुफ़्त)। पहली बार रूम शुरू करने के लिए डॉक्टर गूगल से साइन इन करते हैं।
Open WhatsApp to call | कॉल के लिए व्हाट्सऐप खोलें
WhatsApp opens the chat; tap the video or phone icon there. | व्हाट्सऐप में चैट खुलेगी; वहां वीडियो या फ़ोन का निशान दबाएं।
Confirm & tell patient | पक्का करें और मरीज़ को बताएं
Tell patient | मरीज़ को बताएं
Fee received | फ़ीस मिली
Fee reminder | फ़ीस रिमाइंडर
Reminder | रिमाइंडर
Open patient | मरीज़ खोलें
Fee saved | फ़ीस सेव हो गई
Patient says the fee is paid | मरीज़ कहते हैं फ़ीस दे दी
Check your UPI app, then confirm. | अपना UPI ऐप देखें, फिर पक्का करें।
Check your UPI and confirm | अपना UPI देखें और पक्का करें
Send a reminder | रिमाइंडर भेजें
{} wants an appointment | {1} अपॉइंटमेंट चाहते हैं
{} says fee paid {} | {1} कहते हैं फ़ीस {2} दे दी
{}: fee {} pending | {1}: फ़ीस {2} बाकी
Fee paid by {} (check UPI) | {1} ने फ़ीस दी (UPI देखें)
Appointment request: {} | अपॉइंटमेंट रिक्वेस्ट: {1}
Message from {} | {1} का मैसेज
Reading to check: {} | देखने लायक रीडिंग: {1}
Appointment request | अपॉइंटमेंट रिक्वेस्ट
new reading | नई रीडिंग
photo / voice note | फ़ोटो / आवाज़
Namaste | नमस्ते
Namaste {} 🙏 | नमस्ते {1} 🙏
uses this page to look after your health between visits. | इस पेज से विज़िट के बीच भी आपकी सेहत का ध्यान रखता है।
You can send your BP, sugar and weight readings. | आप अपनी बीपी, शुगर और वज़न की रीडिंग भेज सकते हैं।
You can tell your problem by writing, a photo or a voice note. | आप लिखकर, फ़ोटो से या आवाज़ में अपनी परेशानी बता सकते हैं।
You can book an appointment and pay the fee. | आप अपॉइंटमेंट बुक कर सकते हैं और फ़ीस दे सकते हैं।
I agree that my readings, messages, photos and voice notes are shared with this clinic and stored safely by SabManage for my treatment. I can ask the clinic to delete them. | मैं सहमत हूं कि मेरी रीडिंग, मैसेज, फ़ोटो और आवाज़ इस क्लिनिक के साथ साझा हों और मेरे इलाज के लिए सबमैनेज इन्हें सुरक्षित रखे। मैं क्लिनिक से इन्हें हटाने को कह सकता/सकती हूं।
Agree and continue | सहमत हूं, आगे बढ़ें
In an emergency call 108 or go to the nearest hospital. | इमरजेंसी में 108 पर कॉल करें या पास के अस्पताल जाएं।
This page is not for emergencies. | यह पेज इमरजेंसी के लिए नहीं है।
Your next appointment | आपका अगला अपॉइंटमेंट
Appointment request sent | अपॉइंटमेंट की रिक्वेस्ट भेज दी
waiting for the clinic to confirm | क्लिनिक की मंज़ूरी का इंतज़ार
Join video call | वीडियो कॉल से जुड़ें
The doctor will call you on WhatsApp at this time. | डॉक्टर इसी समय आपको व्हाट्सऐप पर कॉल करेंगे।
Map | नक्शा
Send my reading | मेरी रीडिंग भेजें
Tell my problem | अपनी परेशानी बताएं
Write, photo or voice | लिखें, फ़ोटो या आवाज़
Pay fee | फ़ीस दें
Call the clinic | क्लिनिक को कॉल करें
My health | मेरी सेहत
Tap “Send my reading” after you check your BP or sugar at home. | घर पर बीपी या शुगर जांचने के बाद “मेरी रीडिंग भेजें” दबाएं।
Your messages to the clinic and their replies show here. | क्लिनिक को भेजे आपके मैसेज और उनके जवाब यहां दिखेंगे।
Write to the clinic | क्लिनिक को लिखें
Sent to the clinic. Thank you! | क्लिनिक को भेज दिया। धन्यवाद!
Sent. This reading is outside the usual range; the clinic has been told. If you feel unwell, call the clinic. | भेज दिया। यह रीडिंग सामान्य से अलग है; क्लिनिक को बता दिया गया है। तबीयत ठीक न लगे तो क्लिनिक को कॉल करें।
Write, add a photo, or record your voice | लिखें, फ़ोटो जोड़ें या आवाज़ रिकॉर्ड करें
e.g. Since yesterday I have fever and headache | जैसे कल से बुखार और सिर दर्द है
Time you prefer | आपका पसंदीदा समय
The clinic will confirm the time on WhatsApp or here. | क्लिनिक व्हाट्सऐप पर या यहां समय पक्का करेगा।
Send request | रिक्वेस्ट भेजें
e.g. sugar check-up | जैसे शुगर की जांच
Request sent. The clinic will confirm. | रिक्वेस्ट भेज दी। क्लिनिक पक्का करेगा।
Pick a date | तारीख चुनें
Pick a date within the next 90 days | अगले 90 दिनों में कोई तारीख चुनें
Pay | दें
with any UPI app | किसी भी UPI ऐप से
UPI reference / UTR number (optional) | UPI रेफ़रेंस / UTR नंबर (ज़रूरी नहीं)
12-digit number in your UPI app | आपके UPI ऐप में 12 अंकों का नंबर
I have paid | मैंने पेमेंट कर दिया
You told the clinic you have paid. They will confirm soon. | आपने क्लिनिक को बता दिया है कि पेमेंट हो गया। वे जल्दी पक्का करेंगे।
Thank you! The clinic will confirm. | धन्यवाद! क्लिनिक पक्का करेगा।
Link not working | लिंक नहीं चल रहा
This link is not active. Please ask your clinic for a new link. | यह लिंक चालू नहीं है। कृपया अपने क्लिनिक से नया लिंक मांगें।
This clinic is not taking online requests right now. Please call the clinic. | यह क्लिनिक अभी ऑनलाइन रिक्वेस्ट नहीं ले रहा। कृपया क्लिनिक को कॉल करें।
Please give your consent first | कृपया पहले अपनी सहमति दें
Too many readings in one hour. Try later. | एक घंटे में बहुत ज़्यादा रीडिंग। बाद में कोशिश करें।
Too many messages in one hour. Please call the clinic. | एक घंटे में बहुत ज़्यादा मैसेज। कृपया क्लिनिक को कॉल करें।
You already have requests waiting. The clinic will confirm soon. | आपकी रिक्वेस्ट पहले से इंतज़ार में है। क्लिनिक जल्दी पक्का करेगा।
Doctor verification | डॉक्टर की जांच
Approve | मंज़ूर करें
Reject | मना करें
Undo approval | मंज़ूरी वापस लें
Approve without files | बिना फ़ाइल मंज़ूर करें
Clinic | क्लिनिक
Team · Patients | टीम · मरीज़
Type of business | बिज़नेस का प्रकार
Tent / catering / event | टेंट / कैटरिंग / इवेंट
Doctor / Clinic (certificate needed) | डॉक्टर / क्लिनिक (सर्टिफ़िकेट ज़रूरी)
Medical decisions are yours. The app only stores and shows records; it does not diagnose. | इलाज के फ़ैसले आपके हैं। ऐप सिर्फ़ रिकॉर्ड रखता और दिखाता है; बीमारी नहीं बताता।
We have updated our Terms of use and Privacy policy so they match everything the app does now, including the new clinic features: patient records, the patient link, photos and voice notes, and online consultations. | हमने इस्तेमाल की शर्तें और प्राइवेसी पॉलिसी अपडेट की हैं ताकि वे ऐप के सभी कामों से मेल खाएं, नए क्लिनिक फ़ीचर समेत: मरीज़ों के रिकॉर्ड, मरीज़ का लिंक, फ़ोटो और आवाज़, और ऑनलाइन परामर्श।
You are responsible for client, crew and patient details you add, for their consent, and for messages you send. | आप जो क्लाइंट, क्रू और मरीज़ों की जानकारी डालते हैं, उनकी सहमति और आपके भेजे मैसेज की ज़िम्मेदारी आपकी है।
Apne business ka poora hisaab, ek app mein. | अपने बिज़नेस का पूरा हिसाब, एक ऐप में।
Tent · Catering · Events · Clinics | टेंट · कैटरिंग · इवेंट · क्लिनिक
Tent houses, caterers, event managers and doctors: bookings, stock, bills, patients, appointments and payments in one simple app. | टेंट हाउस, कैटरर, इवेंट मैनेजर और डॉक्टर: बुकिंग, स्टॉक, बिल, मरीज़, अपॉइंटमेंट और पेमेंट एक आसान ऐप में।
Live setup | लाइव सेटअप
`);
