<?php

namespace Database\Seeders;

use App\Models\Penalty;
use App\Models\Violation;
use App\Models\ViolationPenalty;
use Illuminate\Database\Seeder;

class ViolationSeeder extends Seeder
{
    /**
     * Real PCZC Student Handbook data (Penalties legend + Minor/Major
     * Offenses tables with their occurrence-based penalty escalation).
     * A handful of cells were smudged/ambiguous in the source photos —
     * see the notes above the affected rows below.
     */
    public function run(): void
    {
        // ---- Penalties (the handbook's numbered "LEGEND") ----
        $penalties = Penalty::factory()->createMany([
            ['ref_number' => 1.00, 'name' => 'Warning', 'description' => 'Warning'],
            ['ref_number' => 1.10, 'name' => 'Oral Warning', 'description' => 'Oral Warning'],
            ['ref_number' => 1.20, 'name' => 'Written Warning', 'description' => 'Written Warning'],
            ['ref_number' => 1.30, 'name' => 'Conference with Parents/Guardians', 'description' => 'Conference with Parents/Guardians'],
            ['ref_number' => 2.00, 'name' => 'Restitution', 'description' => 'Restitution'],
            ['ref_number' => 3.00, 'name' => 'Confiscation', 'description' => 'Confiscation'],
            ['ref_number' => 4.00, 'name' => 'Demerit', 'description' => 'Demerit'],
            ['ref_number' => 5.00, 'name' => 'Suspension', 'description' => 'Suspension'],
            ['ref_number' => 5.10, 'name' => 'Suspension (1 Day) with Community Service', 'description' => 'One (1) Day Suspension with Community Service'],
            ['ref_number' => 5.20, 'name' => 'Suspension (2 Days) with Community Service', 'description' => 'Two (2) Days Suspension with Community Service'],
            ['ref_number' => 5.30, 'name' => 'Suspension (3 Days) with Community Service', 'description' => 'Three (3) Days Suspension with Community Service'],
            ['ref_number' => 5.40, 'name' => 'Suspension (4 Days) with Community Service', 'description' => 'Four (4) Days Suspension with Community Service'],
            ['ref_number' => 5.50, 'name' => 'Suspension (5 Days) with Community Service', 'description' => 'Five (5) Days Suspension with Community Service'],
            ['ref_number' => 6.00, 'name' => 'Exclusion', 'description' => 'Exclusion'],
            ['ref_number' => 7.00, 'name' => 'Dismissal/Non-readmission', 'description' => 'Dismissal/Non-readmission'],
            ['ref_number' => 8.00, 'name' => 'Expulsion', 'description' => 'Expulsion'],
        ]);

        // Built manually (not via ->pluck('id', 'ref_number')) because PHP
        // silently truncates float array keys to integers, which would
        // collapse 1.00/1.10/1.20/1.30 (and every other *.x0 group) onto
        // the same key.
        $penaltyIdsByRef = [];
        foreach ($penalties as $penalty) {
            $penaltyIdsByRef[number_format((float) $penalty->ref_number, 2)] = $penalty->id;
        }

        // Minor Offenses table. `ladder` maps occurrence (1-6) to one or
        // more penalty ref_numbers — some rows stack a second penalty
        // (e.g. Confiscation) on top of the suspension for later occurrences.
        // `keywords` feeds the Python Word2Vec complaint-matching feature
        // (python-api/model_training/complaint_context_analyzer.py) — a
        // handful of related terms a complainant might actually write,
        // averaged in alongside the violation's own (often long, formal)
        // title to give it a richer embedding for matching freeform text.
        $minor = [
            ['name' => 'Unexcused Tardiness or Absence', 'keywords' => ['tardy', 'late', 'absent', 'absence', 'skipping class', 'truancy'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.30], 5 => [5.30], 6 => [5.40]]],
            ['name' => 'Wearing Of Improper And Incomplete Uniforms', 'keywords' => ['uniform', 'improper attire', 'incomplete uniform', 'dress code', 'wrong clothes'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.30], 5 => [5.30], 6 => [5.40]]],
            ['name' => 'Wearing Of Improper And Other Colored Hijab', 'keywords' => ['hijab', 'headscarf', 'veil', 'wrong color', 'dress code violation'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.30], 5 => [5.30], 6 => [5.40]]],
            ['name' => 'Staying in a Prohibited Area', 'keywords' => ['restricted area', 'off limits', 'unauthorized area', 'trespassing', 'forbidden zone'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.30], 5 => [5.30], 6 => [5.40]]],
            ['name' => 'Wearing Of Accessories Earrings For Males Dangling Or Multiple Pairs For Females', 'keywords' => ['earrings', 'accessories', 'jewelry', 'piercing', 'dangling earrings'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.20, 3.00], 5 => [5.30, 3.00], 6 => [5.40, 3.00]]],
            ['name' => 'Wearing Of Heavy Makeup Or Decorative Contact Lenses', 'keywords' => ['makeup', 'cosmetics', 'contact lenses', 'colored lenses', 'heavy makeup'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.30], 5 => [5.30], 6 => [5.40]]],
            ['name' => 'Wearing Of Scarves Patches Caps Bonnets', 'keywords' => ['scarf', 'cap', 'bonnet', 'patch', 'headwear', 'hat'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.20, 3.00], 5 => [5.30, 3.00], 6 => [5.40, 3.00]]],
            ['name' => 'Wearing And Using Electronic Headset Earbuds or Gadgets Without Permission', 'keywords' => ['earphones', 'earbuds', 'headset', 'gadget', 'phone', 'unauthorized use'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.20, 3.00], 5 => [5.30, 3.00], 6 => [5.40, 3.00]]],
            ['name' => 'Wearing Of School Uniform Program Shirt In Public Places Unrelated To School Activity', 'keywords' => ['uniform in public', 'wearing uniform outside', 'misuse of uniform'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.20], 5 => [5.30], 6 => [5.40]]],
            ['name' => 'Colored Nail Polish', 'keywords' => ['nail polish', 'colored nails', 'manicure', 'nail color'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.20], 5 => [5.30], 6 => [5.40]]],
            ['name' => 'Colored Or Dyed Hair Beard', 'keywords' => ['dyed hair', 'colored hair', 'hair color', 'beard', 'grooming violation'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.20], 5 => [5.30], 6 => [5.40]]],
            ['name' => 'Not Following Prescribed Haircut', 'keywords' => ['haircut', 'hair length', 'hairstyle', 'grooming standard'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.20], 5 => [5.30], 6 => [5.40]]],
            // Handbook lists occurrence 6 for this one as "minor to major"
            // (a reclassification, not a penalty) — no 6th-occurrence row here.
            ['name' => 'Not Attending School Functions', 'keywords' => ['absent from event', 'skipping activity', 'non attendance', 'missed event'], 'ladder' => [1 => [1.20], 2 => [5.10], 3 => [5.20], 4 => [5.30], 5 => [5.40]]],
            ['name' => 'Shouting Laughing Boisterously Making Noise', 'keywords' => ['noise', 'shouting', 'loud', 'boisterous', 'disturbance', 'disruptive behavior'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.20], 5 => [5.30], 6 => [5.40]]],
            ['name' => 'Littering In Campus', 'keywords' => ['litter', 'trash', 'garbage', 'throwing waste', 'cleanliness'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10], 4 => [5.20], 5 => [5.30], 6 => [5.40]]],
            ['name' => 'Bringing Plastic Bottles Or Wrappers In Campus', 'keywords' => ['plastic bottle', 'wrapper', 'disposable container', 'banned item'], 'ladder' => [1 => [1.10], 2 => [1.20], 3 => [5.10, 3.00], 4 => [5.20, 3.00], 5 => [5.30, 3.00], 6 => [5.40, 3.00]]],
            ['name' => 'Placing Stickers And Other Objects On School ID', 'keywords' => ['sticker', 'ID tampering', 'defacing ID', 'decorating ID'], 'ladder' => [1 => [1.20], 2 => [5.10], 3 => [5.20], 4 => [5.30], 5 => [5.40]]],
            ['name' => 'Posting Indecent Photos Videos', 'keywords' => ['indecent photo', 'inappropriate video', 'posting online', 'explicit content'], 'ladder' => [1 => [1.20], 2 => [5.10], 3 => [5.20], 4 => [5.30], 5 => [5.40]]],
            ['name' => 'Public Display Of Affection', 'keywords' => ['PDA', 'kissing', 'hugging', 'intimate behavior', 'affection in public'], 'ladder' => [1 => [1.20], 2 => [5.10], 3 => [5.20], 4 => [5.30], 5 => [5.40]]],
            ['name' => 'Indecency In Oral Language Writing Or Action', 'keywords' => ['indecent language', 'vulgar words', 'cursing', 'foul language', 'inappropriate remark'], 'ladder' => [1 => [1.20], 2 => [5.10], 3 => [5.20], 4 => [5.30], 5 => [5.40]]],
        ];

        // Major Offenses table. Handbook item #21 was not legible in the
        // source photos (cut off between pages) and is intentionally omitted.
        $major = [
            // Rows 1-2 had two overlapping sub-ladders in the source (per
            // target/method) that didn't cleanly separate — normalized to a
            // single, monotonically-escalating ladder.
            ['name' => 'Bullying Cyber Embarrassment Personal', 'keywords' => ['bully', 'harass', 'intimidate', 'threaten', 'taunt', 'mock', 'cyberbullying', 'humiliate'], 'ladder' => [1 => [1.30], 2 => [5.10], 3 => [5.20], 4 => [5.30], 5 => [5.40], 6 => [5.50]]],
            ['name' => 'Assaulting Fellow Students', 'keywords' => ['assault', 'hit', 'punch', 'physical attack', 'fight', 'hurt classmate'], 'ladder' => [1 => [1.30], 2 => [5.10], 3 => [5.20], 4 => [5.30], 5 => [5.40], 6 => [6.00]]],
            ['name' => 'Purchase Sale Of Alcohol Inside Or Outside Campus', 'keywords' => ['alcohol', 'liquor', 'drinking', 'buying alcohol', 'selling alcohol', 'beer'], 'ladder' => [1 => [5.10], 2 => [5.20], 3 => [5.30], 4 => [5.40], 5 => [5.50], 6 => [6.00]]],
            ['name' => 'Provocation Leading To Confrontation', 'keywords' => ['provoke', 'confrontation', 'instigate', 'taunting', 'argument', 'altercation'], 'ladder' => [1 => [5.10], 2 => [5.20], 3 => [5.30], 4 => [5.40], 5 => [5.50], 6 => [6.00]]],
            ['name' => 'Prohibited Use of Gadgets', 'keywords' => ['phone', 'gadget', 'cellphone', 'device', 'unauthorized use', 'banned electronics'], 'ladder' => [1 => [5.10], 2 => [5.20], 3 => [5.30], 4 => [5.40], 5 => [5.50], 6 => [6.00]]],
            ['name' => 'Posting Uploading Destructive Language Online', 'keywords' => ['online post', 'destructive language', 'social media', 'hate speech', 'defamatory post'], 'ladder' => [1 => [5.10], 2 => [5.20], 3 => [5.30], 4 => [5.40], 5 => [5.50], 6 => [6.00]]],
            ['name' => 'Unbecoming Attitude Endangering Others', 'keywords' => ['reckless behavior', 'endangering', 'unbecoming attitude', 'dangerous act'], 'ladder' => [1 => [1.30], 2 => [5.10], 3 => [5.20], 4 => [5.30], 5 => [5.40], 6 => [6.00]]],
            ['name' => 'Altering Information Or Unauthorized Access', 'keywords' => ['hacking', 'unauthorized access', 'altering records', 'tampering data', 'breach'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Bringing Outsiders During School Function', 'keywords' => ['outsider', 'uninvited guest', 'non student', 'unauthorized visitor'], 'ladder' => [1 => [5.30], 2 => [5.50], 3 => [6.00], 4 => [7.00]]],
            ['name' => 'Bringing Outsiders For Fighting', 'keywords' => ['outsider fight', 'bringing gang', 'external fighters', 'recruiting outsiders'], 'ladder' => [1 => [5.30], 2 => [5.50], 3 => [6.00], 4 => [7.00]]],
            ['name' => 'Circulating Destructive Language In Social Media', 'keywords' => ['social media', 'destructive language', 'spreading rumors', 'online post', 'defamation'], 'ladder' => [1 => [5.30], 2 => [5.50], 3 => [6.00], 4 => [7.00]]],
            ['name' => 'Cheating In Examinations Plagiarism', 'keywords' => ['cheat', 'plagiarism', 'copying', 'exam cheating', 'academic dishonesty', 'crib sheet'], 'ladder' => [1 => [5.30, 4.00], 2 => [5.40, 4.00], 3 => [5.50, 4.00], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Cybercrime Computer Security Breach', 'keywords' => ['hacking', 'cybercrime', 'security breach', 'unauthorized computer access'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            // Source showed "3.4"/"3.5" here, which aren't valid penalty
            // codes anywhere in the legend — read as "5.4"/"5.5" to match
            // the identical pattern in every neighboring row.
            ['name' => 'Damaging Destroying Information', 'keywords' => ['destroying data', 'deleting files', 'damaging records', 'data loss'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Dishonesty', 'keywords' => ['lying', 'deceit', 'dishonest act', 'false statement', 'misrepresentation'], 'ladder' => [1 => [5.30], 2 => [5.50], 3 => [6.00], 4 => [7.00]]],
            ['name' => 'Display Possession Or Distribution Of Pornographic Materials', 'keywords' => ['pornography', 'explicit material', 'indecent material', 'distributing porn'], 'ladder' => [1 => [5.30], 2 => [5.50], 3 => [6.00], 4 => [7.00]]],
            ['name' => 'Engaging In Any Form Of Gambling', 'keywords' => ['gambling', 'betting', 'cards', 'dice', 'wagering money'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00]]],
            ['name' => 'Falsification Of Official Documents', 'keywords' => ['falsifying documents', 'forged papers', 'fake records', 'document fraud'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Inciting Others To Violate School Regulations', 'keywords' => ['inciting', 'instigating rule breaking', 'encouraging violation', 'provoking others'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [6.00]]],
            ['name' => 'Introducing False Information To Avoid Class', 'keywords' => ['fake excuse', 'false information', 'lying to skip class', 'fabricated reason'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            // Item #21 omitted — illegible in the source photos.
            ['name' => 'Jumping Over The School Fence', 'keywords' => ['fence jumping', 'climbing fence', 'unauthorized exit', 'sneaking out'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Leaving The Classroom Without Permission', 'keywords' => ['leaving class', 'unauthorized exit', 'skipping class', 'walking out'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Lending Borrowing Or Using Another Persons ID', 'keywords' => ['ID sharing', 'borrowed ID', 'fake identity', 'using someone elses ID'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Preventing Authorized Use Of School Facilities', 'keywords' => ['blocking facility', 'denying access', 'obstructing use', 'facility misuse'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Preventing Normal Operation Of Systems', 'keywords' => ['system disruption', 'sabotage', 'interference', 'disrupting operation'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            // Source showed "3.5" here — read as "5.5", same correction as above.
            ['name' => 'Repeated Use Of Profane Or Indecent Language', 'keywords' => ['cursing', 'profanity', 'swearing', 'vulgar language', 'foul words'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Shoplifting', 'keywords' => ['stealing from store', 'shoplifting', 'theft', 'taking without paying'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Smoking Vaping Or Possession Of Cigarettes', 'keywords' => ['smoking', 'vaping', 'cigarette', 'tobacco', 'vape pen', 'e cigarette'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Stealing Property Of School Or Students', 'keywords' => ['stealing', 'theft', 'taking property', 'robbery', 'missing belongings'], 'ladder' => [1 => [5.30, 2.00], 2 => [5.50, 2.00], 3 => [6.00], 4 => [7.00]]],
            ['name' => 'Tampering With School ID Or Records', 'keywords' => ['tampering', 'altering ID', 'falsifying records', 'fake ID'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Unjust Enrichment Or Theft', 'keywords' => ['theft', 'stealing', 'unjust gain', 'taking others money'], 'ladder' => [1 => [5.30], 2 => [5.50], 3 => [6.00], 4 => [7.00]]],
            ['name' => 'Vandalism Or Destruction Of School Property', 'keywords' => ['vandalism', 'destruction', 'damaging property', 'graffiti', 'breaking property'], 'ladder' => [1 => [5.30, 2.00], 2 => [5.40, 2.00], 3 => [5.50, 2.00], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Viewing Pornographic Sites In Computer Laboratory', 'keywords' => ['pornography', 'explicit website', 'computer lab misuse', 'inappropriate site'], 'ladder' => [1 => [5.30], 2 => [5.50], 3 => [6.00], 4 => [7.00]]],
            ['name' => 'Wearing Indecent Clothing', 'keywords' => ['indecent clothing', 'inappropriate attire', 'revealing clothes', 'immodest dress'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Willful Damage Of School Property', 'keywords' => ['intentional damage', 'destroying property', 'vandalism', 'breaking equipment'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Failure To Comply With Investigation Summons', 'keywords' => ['ignoring summons', 'non compliance', 'refusing investigation', 'avoiding inquiry'], 'ladder' => [1 => [5.30], 2 => [5.40], 3 => [5.50], 4 => [6.00], 5 => [7.00]]],
            ['name' => 'Trouble Outside School Related To School Matters', 'keywords' => ['outside conflict', 'off campus trouble', 'external altercation'], 'ladder' => [1 => [5.40], 2 => [5.50], 3 => [6.00]]],
            ['name' => 'Forging Signatures Of Authorities Or Parents', 'keywords' => ['forged signature', 'fake signature', 'signature fraud', 'forgery'], 'ladder' => [1 => [5.40], 2 => [6.00], 3 => [7.00]]],
            ['name' => 'Bringing Dishonor To The School', 'keywords' => ['disgracing school', 'tarnishing reputation', 'embarrassing school', 'dishonorable act'], 'ladder' => [1 => [5.50], 2 => [6.00]]],
            ['name' => 'Gross Acts Of Disobedience', 'keywords' => ['defiance', 'disobedience', 'refusing orders', 'insubordinate act'], 'ladder' => [1 => [5.50], 2 => [6.00], 3 => [7.00]]],
            ['name' => 'Extortion Blackmailing Ridicule Or Contempt', 'keywords' => ['extortion', 'blackmail', 'ridicule', 'contempt', 'coercion', 'threatening for money'], 'ladder' => [1 => [5.50], 2 => [6.00], 3 => [7.00]]],
            ['name' => 'Insubordination To Authorities', 'keywords' => ['defying authority', 'disrespecting officials', 'disobeying instructions', 'insubordinate'], 'ladder' => [1 => [5.50], 2 => [6.00], 3 => [7.00]]],
            ['name' => 'Slander Or Oral Defamation', 'keywords' => ['slander', 'defamation', 'spreading lies', 'verbal attack', 'badmouthing'], 'ladder' => [1 => [5.50], 2 => [6.00], 3 => [7.00]]],
            ['name' => 'Invasion Of Privacy', 'keywords' => ['privacy violation', 'spying', 'snooping', 'unauthorized access to personal info'], 'ladder' => [1 => [5.50], 2 => [6.00], 3 => [7.00]]],
            ['name' => 'Breach Of Confidentiality', 'keywords' => ['leaking information', 'confidentiality breach', 'disclosing secrets'], 'ladder' => [1 => [5.50], 2 => [6.00], 3 => [7.00]]],
            ['name' => 'Organizing Groups To Damage School Property', 'keywords' => ['organized vandalism', 'group destruction', 'planning damage'], 'ladder' => [1 => [5.50], 2 => [6.00], 3 => [7.00]]],
            ['name' => 'Repeated Offense', 'keywords' => ['repeat violation', 'habitual offender', 'recurring misconduct'], 'ladder' => [1 => [5.50], 2 => [6.00], 3 => [7.00]]],
            ['name' => 'Premarital Sex', 'keywords' => ['premarital sex', 'sexual relationship', 'intimate relations'], 'ladder' => [1 => [6.00], 2 => [7.00]]],
            ['name' => 'Immoral Or Indecent Conduct', 'keywords' => ['immoral behavior', 'indecent conduct', 'inappropriate act'], 'ladder' => [1 => [6.00], 2 => [7.00], 3 => [8.00]]],
            ['name' => 'Presence In Providing Financing Venues For Sororities', 'keywords' => ['sorority funding', 'fraternity venue', 'hosting event'], 'ladder' => [1 => [6.00], 2 => [7.00]]],
            ['name' => 'Promoting Or Participating In Immoral Indecent Conduct', 'keywords' => ['promoting immorality', 'participating indecent act'], 'ladder' => [1 => [6.00], 2 => [7.00], 3 => [8.00]]],
            ['name' => 'Recruitment Membership In Illegal Fraternities', 'keywords' => ['fraternity recruitment', 'illegal frat', 'hazing', 'membership'], 'ladder' => [1 => [6.00], 2 => [7.00]]],
            ['name' => 'Pushing Or Distributing Drugs', 'keywords' => ['drug dealing', 'selling drugs', 'distributing narcotics', 'pushing drugs'], 'ladder' => [1 => [6.00], 2 => [7.00], 3 => [8.00]]],
            ['name' => 'Conviction For Criminal Offense', 'keywords' => ['criminal conviction', 'court case', 'crime', 'sentenced'], 'ladder' => [1 => [7.00]]],
            ['name' => 'Direct Assault On Administration Faculty Or Staff', 'keywords' => ['assaulting teacher', 'attacking staff', 'hitting faculty', 'assault on personnel'], 'ladder' => [1 => [7.00]]],
            ['name' => 'Membership In Sororities Or Fraternities', 'keywords' => ['fraternity', 'sorority', 'membership', 'greek organization'], 'ladder' => [1 => [7.00]]],
            ['name' => 'Possession Or Use Of Deadly Weapons Or Drugs', 'keywords' => ['weapon', 'knife', 'gun', 'drugs', 'deadly weapon', 'possession'], 'ladder' => [1 => [7.00]]],
            ['name' => 'Grave Threat Against Student Or Faculty', 'keywords' => ['threat', 'threatening', 'grave threat', 'intimidation', 'death threat'], 'ladder' => [1 => [7.00]]],
            ['name' => 'Using Another Persons Identity', 'keywords' => ['identity theft', 'impersonation', 'fake identity', 'pretending to be someone'], 'ladder' => [1 => [7.00]]],
            ['name' => 'Consistent Violation Of School Rules', 'keywords' => ['repeated violation', 'habitual rule breaking', 'chronic misconduct'], 'ladder' => [1 => [7.00]]],
        ];

        $violationLinks = [];

        foreach ([[$minor, false], [$major, true]] as [$list, $offenseStatus]) {
            foreach ($list as $entry) {
                $violation = Violation::factory()->create([
                    'violation_name' => $entry['name'],
                    'offense_status' => $offenseStatus,
                    'keywords' => $entry['keywords'] ?? [],
                ]);

                foreach ($entry['ladder'] as $occurrence => $refs) {
                    foreach ($refs as $ref) {
                        $violationLinks[] = [
                            'violation_id' => $violation->id,
                            'occurrence' => $occurrence,
                            'penalty_id' => $penaltyIdsByRef[number_format($ref, 2)],
                        ];
                    }
                }
            }
        }

        ViolationPenalty::factory()->createMany($violationLinks);
    }
}
