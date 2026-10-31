/* ⓘ help + Hindi for the clinic case sheet (clinic-case.js) */
Object.assign(HELP, {
  'pt-records': [['Case history', 'केस हिस्ट्री'], ['Everything about this patient, date-wise: complaint, your notes, examination, diagnosis, treatment, medicines, advice, consent forms and payments. Print the full case sheet for signature.', 'इस मरीज़ का सब कुछ, तारीख़ के हिसाब से: शिकायत, आपके नोट्स, जांच, डायग्नोसिस, इलाज, दवाइयां, सलाह, सहमति फ़ॉर्म और पेमेंट। साइन के लिए पूरी केस शीट प्रिंट करें।'],
    [['Tap New visit.', 'नई विज़िट दबाएं।'], ['Tap only the parts you need: complaint, examination, treatment, medicines…', 'सिर्फ़ ज़रूरी हिस्से दबाएं: शिकायत, जांच, इलाज, दवाइयां…'], ['Save. The bill, tooth chart and timeline update by themselves.', 'सेव करें। बिल, दांतों का चार्ट और टाइमलाइन अपने आप अपडेट होते हैं।']]],
  'pt-fees': [['Bills & payments', 'बिल और पेमेंट'], ['Total charged for visits and appointments, paid and due. The patient sees the same on their link. A payment first closes unpaid appointment fees, then the rest of the bill.', 'विज़िट और अपॉइंटमेंट का कुल बिल, मिला और बाकी। मरीज़ अपने लिंक पर यही देखता है। पेमेंट पहले बाकी अपॉइंटमेंट फ़ीस में जुड़ता है, फिर बाकी बिल में।']],
  'pt-health': [['Health', 'सेहत'], ['Readings and charts. They show only for patients with a medical problem (Medical alert: Yes in the patient profile).', 'रीडिंग और चार्ट। ये सिर्फ़ उन मरीज़ों के लिए दिखते हैं जिन्हें कोई बीमारी है (मरीज़ की प्रोफ़ाइल में मेडिकल अलर्ट: हां)।']]
});
I18N.load(Object.keys(HELP).filter(k => /^pt-(records|fees|health)$/.test(k))
  .flatMap(k => { const [t, w, steps, tip] = HELP[k]; return [t, w, ...(steps || []), ...(tip ? [tip] : [])]; }).map(([en, hi]) => en + ' | ' + hi).join('\n'));
I18N.load(`
Case history | केस हिस्ट्री
Bills & payments | बिल और पेमेंट
New visit | नई विज़िट
Edit visit | विज़िट बदलें
Save visit | विज़िट सेव करें
Visit saved | विज़िट सेव हो गई
visit | विज़िट
Visits | विज़िट
Everything | सब कुछ
Consents | सहमति फ़ॉर्म
Complaint | शिकायत
Chief complaint | मुख्य शिकायत
Chief complaint (in the patient’s words) | मुख्य शिकायत (मरीज़ के शब्दों में)
e.g. Pain in lower right back tooth while eating | जैसे खाते समय नीचे दाईं ओर पीछे के दांत में दर्द
Doctor’s notes | डॉक्टर के नोट्स
Doctor’s notes (in your words) | डॉक्टर के नोट्स (अपने शब्दों में)
History, what you explained to the patient… | बीमारी का इतिहास, मरीज़ को क्या समझाया…
Examination | जांच
On examination | जांच में मिला
Treatment done | किया गया इलाज
Medicines (Rx) | दवाइयां (आरएक्स)
Reports / photos | रिपोर्ट / फ़ोटो
Charges | चार्ज
Charge | चार्ज
What happened in this visit? Tap to add | इस विज़िट में क्या हुआ? जोड़ने के लिए दबाएं
Since when | कब से
since | से
2–3 days | 2–3 दिन
1 week | 1 हफ़्ता
2 weeks | 2 हफ़्ते
1 month | 1 महीना
More than a month | एक महीने से ज़्यादा
Which tooth / area (if the patient shows) | कौन सा दांत / जगह (अगर मरीज़ बताए)
tooth | दांत
Tooth / teeth | दांत
Oral health | मुंह की सेहत
Good | अच्छी
Average | औसत
Poor | ख़राब
Very poor | बहुत ख़राब
— Choose treatment — | — इलाज चुनें —
Missing tooth (replaced by the bridge) | गायब दांत (जिसकी जगह ब्रिज लगा)
Support teeth (cap on them) | सहारे वाले दांत (जिन पर कैप लगी)
Cap material | कैप का मटीरियल
Sitting | सिटिंग
Started | शुरू
Sitting 2 | दूसरी सिटिंग
Sitting 3 | तीसरी सिटिंग
Add medicine | दवा जोड़ें
Medicine name | दवा का नाम
Before food | खाने से पहले
At night | रात को
When needed | ज़रूरत पड़ने पर
Medicines (written earlier) | दवाइयां (पहले लिखी हुई)
Advice to the patient | मरीज़ को सलाह
Add photos, X-rays or reports | फ़ोटो, एक्स-रे या रिपोर्ट जोड़ें
Consultation fee ₹ | परामर्श फ़ीस ₹
Extra fee ₹ (appointment fee is already in the bill) | अतिरिक्त फ़ीस ₹ (अपॉइंटमेंट फ़ीस बिल में पहले से है)
Received now ₹ | अभी मिला ₹
Total for this visit | इस विज़िट का कुल
Due for this visit | इस विज़िट का बाकी
Delete this visit? | यह विज़िट हटाएं?
Its charge and payment are removed from the bill too. | इसका चार्ज और पेमेंट भी बिल से हट जाएगा।
Sensitivity to cold / hot | ठंडा-गरम लगना
Broken / chipped tooth | टूटा / चटका दांत
Missing tooth | गायब दांत
Loose tooth | हिलता दांत
Bad breath | मुंह से बदबू
Food getting stuck | खाना फंसना
Yellow / stained teeth | पीले / दाग वाले दांत
Wants braces | ब्रेसेस चाहिए
Routine check-up | रूटीन चेक-अप
Cough | खांसी
Cold | ज़ुकाम
Headache | सिरदर्द
Body ache | बदन दर्द
Stomach pain | पेट दर्द
Weakness | कमज़ोरी
BP check | बीपी जांच
Sugar check | शुगर जांच
Caries | कीड़ा (कैरीज़)
Deep caries | गहरा कीड़ा
Tender on percussion | ठोकने पर दर्द
Mobility | दांत हिलना
Calculus / tartar | टार्टर / पथरी
Fractured tooth | टूटा दांत
Abscess / swelling | फोड़ा / सूजन
Root stump | जड़ बची है
Impacted tooth | फंसा हुआ दांत
Stains | दाग
Temperature normal | तापमान सामान्य
Fever present | बुखार है
Throat congested | गले में सूजन
Chest clear | छाती साफ़
Wheeze | सीटी की आवाज़
Abdomen soft | पेट नरम
Tenderness | दबाने पर दर्द
BP normal | बीपी सामान्य
Pallor | पीलापन
Dehydrated | पानी की कमी
Irreversible pulpitis | नस में गहरा संक्रमण (पल्पाइटिस)
Chronic gingivitis | पुरानी मसूड़ों की सूजन
Chronic periodontitis | पायरिया
Impacted third molar | फंसी हुई अक्ल दाढ़
Missing teeth | गायब दांत
Dentin hypersensitivity | दांतों में झनझनाहट
Malocclusion | टेढ़े-मेढ़े दांत
Viral fever | वायरल बुखार
Upper respiratory infection | गले-नाक का संक्रमण
Acute gastroenteritis | पेट का संक्रमण
Hypertension | हाई बीपी
Type 2 diabetes | टाइप 2 डायबिटीज़
Acidity / gastritis | एसिडिटी
Migraine | माइग्रेन
Check-up / consultation | चेक-अप / परामर्श
Filling (GIC) | फ़िलिंग (जीआईसी)
RCT | आरसीटी (रूट कैनाल)
RCT with cap | आरसीटी कैप के साथ
Cap / crown | कैप / क्राउन
Denture (partial) | आंशिक बत्तीसी
Denture (complete) | पूरी बत्तीसी
Pulpectomy (child) | पल्पेक्टॉमी (बच्चे)
Braces / adjustment | ब्रेसेस / एडजस्टमेंट
Consultation | परामर्श
Dressing | ड्रेसिंग
Injection | इंजेक्शन
IV drip | ड्रिप
Nebulisation | नेबुलाइज़ेशन
ECG | ईसीजी
Plaster | प्लास्टर
Minor procedure | छोटी प्रक्रिया
Physiotherapy session | फ़िज़ियोथेरेपी सेशन
missing | गायब
support | सहारा
units | यूनिट
Metal-ceramic (PFM) | मेटल-सिरेमिक (पीएफएम)
Zirconia | ज़िरकोनिया
E-max | ई-मैक्स
Metal | मेटल
Temporary | अस्थायी
Do not eat for 1 hour | 1 घंटे तक कुछ न खाएं
Soft, cold food for 24 hours | 24 घंटे तक नरम, ठंडा खाना
Warm salt-water rinse 3 times a day | दिन में 3 बार गुनगुने नमक-पानी से कुल्ला
Do not spit or use a straw for 24 hours | 24 घंटे तक थूकें नहीं, स्ट्रॉ न लें
Do not chew on the treated side | इलाज वाली तरफ़ से न चबाएं
Brush twice a day | दिन में दो बार ब्रश करें
Avoid very hot or cold food | बहुत गरम या ठंडा न खाएं
Come back if pain or swelling increases | दर्द या सूजन बढ़े तो फिर आएं
Drink plenty of water | खूब पानी पिएं
Rest for 2 days | 2 दिन आराम करें
Light home food | हल्का घर का खाना
Steam inhalation twice a day | दिन में दो बार भाप लें
Check BP / sugar at home | घर पर बीपी / शुगर जांचें
Come back if fever does not go in 3 days | 3 दिन में बुखार न उतरे तो फिर आएं
Medical alert | मेडिकल अलर्ट
Medical alert: {} | मेडिकल अलर्ट: {1}
Yes · {} | हां · {1}
Takes | लेते हैं
Habits | आदतें
Confirmed by | पक्का किया
Not confirmed by the doctor yet | डॉक्टर ने अभी पक्का नहीं किया
Bill | बिल
No dues | कुछ बाकी नहीं
Complaint noted today | आज नोट की गई शिकायत
Complaint noted | शिकायत नोट है
Consent form | सहमति फ़ॉर्म
Print case sheet | केस शीट प्रिंट करें
Nothing here yet | यहां अभी कुछ नहीं
Tap “New visit”. Note the complaint, what you found, the diagnosis, the treatment and medicines. Everything stays here, date-wise. | “नई विज़िट” दबाएं। शिकायत, जांच में क्या मिला, डायग्नोसिस, इलाज और दवाइयां लिखें। सब कुछ यहां तारीख़ के हिसाब से रहेगा।
Signed by | साइन किए
on the patient link | मरीज़ के लिंक पर
Waiting for signature | साइन बाकी
sent to the patient link | मरीज़ के लिंक पर भेजा
to sign here | यहीं साइन होगा
Sign now | अभी साइन करें
Note complaint | शिकायत नोट करें
Note the complaint | शिकायत नोट करें
What the patient says (in their words) | मरीज़ क्या कहता है (उसके शब्दों में)
Any medical problem? (sugar, BP, heart, asthma, pregnancy, bleeding…) | कोई बीमारी है? (शुगर, बीपी, दिल, दमा, गर्भावस्था, खून बहना…)
Yes | हां
No | नहीं
Diabetes | डायबिटीज़ (शुगर)
High BP | हाई बीपी
Heart problem | दिल की बीमारी
Asthma | दमा
Fits / epilepsy | मिर्गी / दौरे
Bleeding problem | खून न रुकने की समस्या
Kidney problem | किडनी की बीमारी
Liver problem | लिवर की बीमारी
Pregnant | गर्भवती
On blood thinner | खून पतला करने की दवा पर
Hepatitis / HIV | हेपेटाइटिस / एचआईवी
Other problem / details | दूसरी बीमारी / जानकारी
e.g. Diabetes for 5 years | जैसे 5 साल से डायबिटीज़
Medicines the patient takes now | मरीज़ अभी कौन सी दवाइयां लेता है
e.g. Ecosprin 75, Metformin 500 | जैसे इकोस्प्रिन 75, मेटफ़ॉर्मिन 500
Readings and charts show only for patients with a medical problem. | रीडिंग और चार्ट सिर्फ़ बीमारी वाले मरीज़ों के लिए दिखते हैं।
Any allergy? | कोई एलर्जी है?
Allergic to | किससे एलर्जी
e.g. Penicillin, sulpha, latex | जैसे पेनिसिलिन, सल्फ़ा, लेटेक्स
Smoking | धूम्रपान
Tobacco / gutka | तंबाकू / गुटखा
Alcohol | शराब
Supari / paan | सुपारी / पान
Teeth grinding | दांत पीसना
Nail biting | नाखून चबाना
Mouth breathing | मुंह से सांस लेना
I asked the patient and confirm these habits | मैंने मरीज़ से पूछा, ये आदतें पक्की हैं
The doctor will confirm these with the patient. | डॉक्टर मरीज़ से पूछकर इन्हें पक्का करेंगे।
Address (optional) | पता (चाहें तो)
Total bill | कुल बिल
Send bill | बिल भेजें
The patient sees the same total, paid and due on their link. | मरीज़ अपने लिंक पर यही कुल, मिला और बाकी देखता है।
Nothing charged yet | अभी कोई चार्ज नहीं
No payment yet | अभी कोई पेमेंट नहीं
fee | फ़ीस
Delete this payment? | यह पेमेंट हटाएं?
Form | फ़ॉर्म
Language for the patient | मरीज़ के लिए भाषा
Title | शीर्षक
Text the patient will read (you can change it) | मरीज़ जो पढ़ेगा (आप बदल सकते हैं)
Save this text as my own form | इसे मेरे अपने फ़ॉर्म के रूप में सेव करें
Send to patient link | मरीज़ के लिंक पर भेजें
Patient signs here | मरीज़ यहीं साइन करेगा
Write the consent text | सहमति का टेक्स्ट लिखें
Sent to the patient link | मरीज़ के लिंक पर भेज दिया
Consent for examination and treatment | जांच और इलाज के लिए सहमति
Consent for local anaesthesia (injection) | सुन्न करने के इंजेक्शन के लिए सहमति
Consent for root canal treatment (RCT) | रूट कैनाल इलाज (आरसीटी) के लिए सहमति
Consent for tooth extraction | दांत निकालने के लिए सहमति
Consent for dental implant / bridge | इम्प्लांट / ब्रिज के लिए सहमति
Consent for photos and records | फ़ोटो और रिकॉर्ड के लिए सहमति
Name of the person signing | साइन करने वाले का नाम
Signing as | किस रूप में साइन
Parent / guardian | माता-पिता / अभिभावक
I have read this form (or it was read to me) and I understand it. I agree. | मैंने यह फ़ॉर्म पढ़ लिया है (या मुझे पढ़कर सुनाया गया) और समझ लिया है। मैं सहमत हूं।
Signature | हस्ताक्षर
Sign inside the box with a finger | डिब्बे के अंदर उंगली से साइन करें
Upload photo | फ़ोटो डालें
Final submit | फ़ाइनल सबमिट
Hand the phone to the patient | फ़ोन मरीज़ को दें
Tick “I agree” and sign | “मैं सहमत हूं” पर टिक करें और साइन करें
Consent saved | सहमति सेव हो गई
Form to read and sign | पढ़कर साइन करने के लिए फ़ॉर्म
Tap to read, agree and sign | पढ़ने, सहमति देने और साइन करने के लिए दबाएं
My bill | मेरा बिल
See details | पूरी जानकारी देखें
After paying, send the screenshot in Messages so the clinic can mark it paid. | पैसे देने के बाद मैसेज में स्क्रीनशॉट भेजें ताकि क्लिनिक इसे पेड कर दे।
Forms I have signed | मेरे साइन किए फ़ॉर्म
Thank you. The form is signed. | धन्यवाद। फ़ॉर्म साइन हो गया।
Signature box | हस्ताक्षर का डिब्बा
C/C — Chief complaint | मुख्य शिकायत
In the patient’s words | मरीज़ के शब्दों में
RCT + Cap | आरसीटी + कैप
Cap | कैप
Filling | फ़िलिंग
Scaling | स्केलिंग
X-ray | एक्स-रे
X-ray / photo | एक्स-रे / फ़ोटो
PFM | पीएफ़एम
1st | पहली
2nd | दूसरी
3rd | तीसरी
continues | जारी
Change support teeth | सपोर्ट वाले दांत बदलें
Tap the missing tooth | जो दांत नहीं है उस पर टैप करें
tap the missing tooth | जो दांत नहीं है उस पर टैप करें
tap the tooth | दांत पर टैप करें
Which treatment? | कौन-सा इलाज?
Extra fee ₹ | अतिरिक्त फ़ीस ₹
Received ₹ | मिले ₹
3 days | 3 दिन
15 days | 15 दिन
Patient signature | मरीज़ के हस्ताक्षर
Sign again | फिर से हस्ताक्षर करें
Sign here | यहां हस्ताक्षर करें
Tap here and sign with your finger | यहां टैप करें और उंगली से हस्ताक्षर करें
or upload a photo of the signature | या हस्ताक्षर की फ़ोटो अपलोड करें
Dose | खुराक
Medicine | दवा
more | ज़्यादा
Problem in an old treatment? | पुराने इलाज में दिक्कत?
Problem in old | पुराने इलाज में दिक्कत:
Problem in old treatment | पुराने इलाज में दिक्कत
done here | यहां हुआ
done at another clinic | दूसरे क्लिनिक में हुआ
Done at another clinic | दूसरे क्लिनिक में हुआ
other clinic | दूसरा क्लिनिक
Other clinic | दूसरा क्लिनिक
Tap the tooth too | दांत पर भी टैप करें
Re-RCT | दोबारा आरसीटी
Cap re-fix | कैप फिर से लगाना
Additional doctor fee | अतिरिक्त डॉक्टर फ़ीस
Fees & treatment prices | फ़ीस और इलाज के दाम
Consultation, X-ray, every treatment and your own treatments | कंसल्टेशन, एक्स-रे, हर इलाज और आपके अपने इलाज
Consultation fee | कंसल्टेशन फ़ीस
Video / WhatsApp call fee | वीडियो / व्हाट्सऐप कॉल फ़ीस
per tooth | प्रति दांत
per unit | प्रति यूनिट
Your own treatments | आपके अपने इलाज
Treatment name | इलाज का नाम
Once | एक बार
Per tooth | प्रति दांत
Treatments done | हुए इलाज
Prices | दाम
No treatment yet | अभी कोई इलाज नहीं
When (about) | कब (लगभग)
e.g. 2 years ago | जैसे 2 साल पहले
Remove this? | इसे हटाएं?
Patient added | मरीज़ जोड़ा गया
Medicines given | दवाइयां दीं
Advice given | सलाह दी
Patient signed | मरीज़ ने हस्ताक्षर किए
Next visit fixed | अगली विज़िट तय
Consent form made | सहमति फ़ॉर्म बना
Consent signed | सहमति पर हस्ताक्षर
Sent on the patient link | मरीज़ के लिंक पर भेजा
To sign here | यहीं साइन के लिए
here | यहीं
witness | गवाह
Old treatment (other clinic) | पुराना इलाज (दूसरा क्लिनिक)
Everything | सब कुछ
Regular discount % (optional) | हमेशा की छूट % (ज़रूरी नहीं)
Search name, mobile or treatment (e.g. RCT, 46) | नाम, मोबाइल या इलाज खोजें (जैसे आरसीटी, 46)
No patient found | कोई मरीज़ नहीं मिला
`);
