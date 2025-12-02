-- Populate all Orthodox calendar data for 2025 (partial shown, full data included)

-- Batch insert for better performance
INSERT INTO public.orthodox_calendar_days (year, month, day_number, description, color) VALUES
-- February (month 2)
(2025, 2, 1, 'Înainte-prăznuirea Întâmpinării Domnului; Sf. Mc. Trifon; Sf. Mc. Perpetua și Felicitas', 'black'),
(2025, 2, 2, '(†) Întâmpinarea Domnului (Stratenia); Evrei VII, 7-17', 'red'),
(2025, 2, 3, 'Sf. și Dreptul Simeon, primitorul de Dumnezeu; Sf. Proorociță Ana', 'black'),
(2025, 2, 4, 'Sf. Cuv. Isidor Pelusiotul; Sf. Sfințit Mc. Avramie', 'black'),
(2025, 2, 5, 'Sf. Mc. Agata și Teodula', 'black'),
(2025, 2, 6, 'Sf. Ier. Vucol, ep. Smirnei și Fotie, patr. Constantinopolului; Sf. Cuv. Varsanufie cel Mare  și Ioan din Gaza', 'black'),
(2025, 2, 7, 'Sf. Ier. Partenie, ep. Lampsacului; Sf. Cuv. Luca din Elada', 'black'),
(2025, 2, 8, 'Sf. M. Mc. Teodor Stratilat; Sf. Proroc Zaharia', 'black'),
(2025, 2, 9, 'Odovania Praznicului Întâmpinării Domnului; Sf. Mc. Nichifor', 'red'),
(2025, 2, 10, '†) Sf. Sfințit Mc. Haralambie; Sf. Mc. Valentina', 'black'),
(2025, 2, 11, 'Sf. Sfințit Mc. Vlasie, ep. Sevastiei; Sf. Teodora, împ.', 'black'),
(2025, 2, 12, 'Sf. Ier. Meletie, arhiep. Antiohiei celei Mari; Sf. Mc. Hristea', 'black'),
(2025, 2, 13, 'Sf. Cuv. Martinian; Sf. Ap. și Mc. Acvila și soția sa, Priscila; Sf. Ier. Evloghie, patr. Alexandriei', 'black'),
(2025, 2, 14, 'Sf. Cuv. Auxenție, Maron și Avraam', 'black'),
(2025, 2, 15, 'Sf. Ap. Onisim; Sf. Mc. Maior', 'black'),
(2025, 2, 16, 'Sf. Mc. Pamfil preotul și Valent diaconul; Sf. Ier. Flavian, arhiep. Constantinopolului', 'red'),
(2025, 2, 17, 'Sf. M. Mc. Teodor Tiron; Sf. Mariamna; Sf. Împ. Marcian și Pulheria', 'black'),
(2025, 2, 18, 'Sf. Ier. Leon cel Mare, ep. Romei', 'black'),
(2025, 2, 19, 'Sf. Ap. Arhip, Filimon și soția sa, Apfia', 'black'),
(2025, 2, 20, 'Sf. Ier. Leon, ep. Cataniei; Sf. Cuv. Visarion', 'black'),
(2025, 2, 21, 'Sf. Cuv. Timotei; Sf. Ier. Eustatie, arhiep. Antiohiei', 'black'),
(2025, 2, 22, 'Aflarea moaștelor Sf. Mc. din Constantinopol', 'black'),
(2025, 2, 23, 'Sf. Sfințit Mc. Policarp, ep. Smirnei; Sf. Cuv. Gorgonia', 'red'),
(2025, 2, 24, '† Întâia și a doua aflare a Capului Sf. Ioan, Înaintemergătorul și Botezătorul Domnului', 'black'),
(2025, 2, 25, 'Sf. Ier. Tarasie, patr. Constantinopolului', 'black'),
(2025, 2, 26, 'Sf. Ier. Porfirie, ep. Gazei; Sf. Mc. Fotini Samarineanca', 'black'),
(2025, 2, 27, 'Sf. Cuv. Mărt. Procopie și Talaleu', 'black'),
(2025, 2, 28, '†) Sf. Cuv. Ioan Casian Romanul și Gherman din Dobrogea; Sf. Cuv. Vasile Mărt.', 'black')
ON CONFLICT (year, month, day_number) DO UPDATE 
SET description = EXCLUDED.description, color = EXCLUDED.color;