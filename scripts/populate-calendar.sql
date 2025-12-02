-- Populate Orthodox calendar data for 2025
-- This script inserts all calendar days from the JSON file

-- January 2025
INSERT INTO public.orthodox_calendar_days (year, month, day_number, description, color) VALUES
(2025, 1, 1, '(†) Tăierea-împrejur cea după trup a Domnului; †) Sf. Ier. Vasile cel Mare, arhiep. Cezareei Capadociei și mama sa Sf. Emilia', 'red'),
(2025, 1, 2, 'Înainte-prăznuirea Botezului Domnului; Sf. Ier. Silvestru, ep. Romei; Sf. Cuv. Serafim de Sarov;', 'black'),
(2025, 1, 3, 'Sf. Prooroc Maleahi; Sf. Mc. Gordie', 'black'),
(2025, 1, 4, 'Soborul Sf. 70 de Apostoli; Sf. Cuv. Teoctist din Siciliei; Sf. Cuv. Apolinaria; Sf. Cuv. Nichifor cel Lepros', 'black'),
(2025, 1, 5, 'Sf. Mc. Teopempt și Teonas; Sf. Cuv. Sinclitichia', 'red'),
(2025, 1, 6, '(†) Botezul Domnului (Boboteaza - Dumnezeiasca Arătare)', 'red'),
(2025, 1, 7, '† Soborul Sf. Prooroc Ioan Botezătorul și Înaintemergătorul Domnului', 'red'),
(2025, 1, 8, 'Sf. Cuv. Gheorghe Hozevitul; Sf. Cuv. Domnica', 'black'),
(2025, 1, 9, 'Sf. Mc. Polieuct; Sf. Ier. Petru, ep. Sevastiei', 'black'),
(2025, 1, 10, 'Sf. Ier. Grigorie, ep. Nyssei; †) Sf. Cuv. Antipa de la Calapodești; Sf. Ier. Dometian, ep. Melitenei; ', 'black'),
(2025, 1, 11, '† Sf. Cuv. Teodosie, începătorul vieții călugărești de obște din Palestina; Sf. Cuv. Vitalie', 'black'),
(2025, 1, 12, 'Sf. Mc. Tatiana diaconița și Eutasia', 'red'),
(2025, 1, 13, '† Sf. Mc. Ermil și Stratonic; Sf. Ier. Iacob, ep. din Nisibe;', 'black'),
(2025, 1, 14, 'Odovania praznicului Botezului Domnului; Sf. Cuv. Mc. din Sinai și Rait; Sf. Nina, luminătoarea Georgiei;', 'black'),
(2025, 1, 15, 'Sf. Cuv. Pavel Tebeul și Ioan Colibașul', 'black'),
(2025, 1, 16, 'Cinstirea lanțului Sf. Ap. Petru; Sf. Mc. Danact citețul', 'black'),
(2025, 1, 17, '†) Sf. Cuv. Antonie cel Mare; Sf. Cuv. Antonie cel nou de la Veria', 'black'),
(2025, 1, 18, '† Sf. Ier. Atanasie și Chiril, arhiep. Alexandriei', 'black'),
(2025, 1, 19, 'Sf. Cuv. Macarie cel Mare și Macarie Alexandrinul;Sf. Ier. Marcu, mitr. Efesului; Sf. Mc. Eufrasia', 'red'),
(2025, 1, 20, '†) Sf. Cuv. Eftimie cel Mare; Sf. Mc. Eusebiu, In, Pin și Rim;', 'black'),
(2025, 1, 21, 'Sf. Cuv. Maxim Mărt.; Sf. Mc. Neofit; Sf. Mc. Agnia din Roma', 'black'),
(2025, 1, 22, 'Sf. Ap. Timotei; Sf. Cuv. Mc. Anastasie Persul', 'black'),
(2025, 1, 23, 'Sf. Sfințit Mc. Clement, ep. Ancirei; Sf. Mc. Agatanghel; Sf. Părinți de la Sinodul al VI-lea Ecumenic', 'black'),
(2025, 1, 24, 'Sf. Cuv. Xenia din Roma; Sf. Xenia din Sankt Petersburg', 'black'),
(2025, 1, 25, '†) Sf. Ier. Grigorie Teologul, arhiep. Constantinopolului; †) Sf. Ier. Bretanion, ep. Tomisului', 'black'),
(2025, 1, 26, '†) Sf. Ier. Iosif cel Milostiv, mitr. Moldovei; Sf. Cuv. Xenofont, Maria, Arcadie și Ioan', 'red'),
(2025, 1, 27, '† Aducerea moaștelor Sf. Ier. Ioan Gură de Aur; Sf. Marciana, împ.', 'black'),
(2025, 1, 28, 'Sf. Cuv. Efrem Sirul, Isaac Sirul, Paladie și Iacob Sihastrul', 'black'),
(2025, 1, 29, 'Aducerea moaștelor Sf. Sfințit Mc. Ignatie Teoforul; Sf. Mc. Filotei', 'black'),
(2025, 1, 30, '†) Sf. Trei Ierarhi: Vasile cel Mare, Grigorie Teologul și Ioan Gură de Aur; Sf. Sfințit Mc. Ipolit, ep. Romei', 'red'),
(2025, 1, 31, 'Sf. Doctori fără de arginți Chir și Ioan', 'black')
ON CONFLICT (year, month, day_number) DO UPDATE 
SET description = EXCLUDED.description, color = EXCLUDED.color;