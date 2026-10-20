# Facts: Movement, and Play and senses (birth to 3 years)

Research for `plans/implan-development/`. Everything was loaded on 2026-10-12. Facts are paraphrased in plain English. CDC milestone items are quoted almost word for word, since CDC is public domain. Nothing here is invented. When a page doesn't cover something, this file says so.

## How this was read (caveats)

- Every page was loaded with WebFetch, which runs the page through a summarising model. It was asked to be complete and precise, but small items could still be missing. Where it mattered, I checked the raw source myself:
  - WHO: the raw PDFs, read directly.
  - Rikshandboken 18-month follow-up: the raw HTML. WebFetch returned only the page title, so the table was decoded from the HTML.
- **CDC:** WebFetch was not blocked and all 10 checklists loaded. The tool reported no redirects, so the final URLs are the ones requested. (`NOTES.md` records that curl gets a 403 from cdc.gov.)
- **WHO:** the HTML page itself has no numbers. They are in the linked PDFs (URLs below), which I read directly.
- **NHS:** there is no NHS page on movement, sight or hearing milestones under `/baby/babys-development/`. Its four sections are: Height, weight and reviews; Teething; Play and learning; Behaviour. Movement and play facts come from the "Play and learning" subpages.
- **No 404s.** No URL in this file redirected to another URL.

## Which framing each source uses

| Source | Framing | Language |
| --- | --- | --- |
| CDC checklists | "Developmental milestones are things most children (75% or more) can do by a certain age." | English (each page links a Spanish version) |
| WHO motor milestones | Windows of achievement bounded by the 1st and 99th percentiles of healthy children (MGRS, 5 countries); "normal variation" | English |
| 1177 development pages and motor table | Broad, typical age ranges ("children develop at different rates, even siblings"); no thresholds | Swedish only |
| 1177 play page | Approximate age bands | Swedish only |
| NHS | Play ideas "from" an age; activity guidance; no milestone list | English |
| Rikshandboken | For professionals: what is checked at each BVC visit, which deviations to react to, and when to refer | Swedish only |

---

## 1. CDC Learn the Signs. Act Early. (public domain, English)

**Framing on every page:** "Developmental milestones are things most children (75% or more) can do by a certain age." Each page also says the "Learn the Signs. Act Early." materials are "not a substitute for standardized, validated developmental screening tools."

**Act early: the same guidance on every checklist (paraphrased):**
- You know your child best. Don't wait.
- If your child isn't meeting one or more milestones, has lost skills they once had, or you have other concerns, talk with the child's doctor, share your concerns and ask about developmental screening.
- Things to tell the doctor about: what you do together, what the child enjoys, anything that worries you, skills the child has lost, and any special health care needs or premature birth.
- If you or the doctor are still concerned, ask for a referral to a specialist. Also call your state or territory's early intervention program (cdc.gov/FindEI). This last step is US-specific.

### 2 months: https://www.cdc.gov/act-early/milestones/2-months.html
- **Social/emotional:** "Calms down when spoken to or picked up"; "Looks at your face"; "Seems happy to see you when you walk up to her"; "Smiles when you talk to or smile at her"
- **Language/communication:** "Makes sounds other than crying"; "Reacts to loud sounds"
- **Cognitive:** "Watches you as you move"; "Looks at a toy for several seconds"
- **Movement/physical:** "Holds head up when on tummy"; "Moves both arms and both legs"; "Opens hands briefly"
- **Tips (paraphrased):**
  - Tummy time while the baby is awake, with toys at eye level so they practise lifting the head. Never leave the baby alone on the tummy.
  - Shake a rattle off to one side to see if the baby looks toward the sound.
  - Use a baby-safe mirror, bright pictures and faces.
  - Copy the baby's sounds and take turns "talking".
  - Talk and play during feeding, dressing and bath time.
  - Cuddling and responding does not spoil a baby.
  - No screens under 2, except video calls.

### 4 months: https://www.cdc.gov/act-early/milestones/4-months.html
- **Social/emotional:** "Smiles on his own to get your attention"; "Chuckles (not yet a full laugh) when you try to make him laugh"; "Looks at you, moves, or makes sounds to get or keep your attention"
- **Language/communication:** "Makes sounds like "oooo", "aahh" (cooing)"; "Makes sounds back when you talk to him"; "Turns head towards the sound of your voice"
- **Cognitive:** "If hungry, opens mouth when he sees breast or bottle"; "Looks at her hands with interest"
- **Movement/physical:** "Holds head steady without support when you are holding him"; "Holds a toy when you put it in his hand"; "Uses his arm to swing at toys"; "Brings hands to mouth"; "Pushes up onto elbows/forearms when on tummy"
- **Tips (paraphrased):**
  - Give safe chances to reach, kick at toys and explore, for example on a blanket with safe toys.
  - Let the baby mouth safe things that aren't sharp, hot or small enough to choke on.
  - Offer easy-to-hold toys such as rattles and cloth books.
  - Allow time to move, and limit time in swings, strollers and bouncy seats.
  - With the baby on their back, move a bright toy slowly side to side and up and down.
  - Gently move the baby's arms and legs while singing.
  - Hold the baby under the arms with feet on your lap and let them bounce.
  - Play peek-a-boo, and play on the floor or a play mat every day.

### 6 months: https://www.cdc.gov/act-early/milestones/6-months.html
- **Social/emotional:** "Knows familiar people"; "Likes to look at self in a mirror"; "Laughs"
- **Language/communication:** "Takes turns making sounds with you"; "Blows "raspberries" (sticks tongue out and blows)"; "Makes squealing noises"
- **Cognitive:** "Puts things in her mouth to explore them"; "Reaches to grab a toy she wants"; "Closes lips to show she doesn't want more food"
- **Movement/physical:** "Rolls from tummy to back"; "Pushes up with straight arms when on tummy"; "Leans on hands to support herself when sitting"
- **Tips (paraphrased):**
  - Put toys just out of reach during tummy time to encourage rolling.
  - Support sitting and standing with your hands under the baby's arms, and play on the floor every day.
  - Pick up dropped toys, which teaches cause and effect.
  - Look at colourful pictures together every day.
  - Name things on walks.
  - Sing and play music.
  - No screens under 2, except video calls.

### 9 months: https://www.cdc.gov/act-early/milestones/9-months.html
- **Social/emotional:** "Is shy, clingy, or fearful around strangers"; "Shows several facial expressions, like happy, sad, angry, and surprised"; "Looks when you call her name"; "Reacts when you leave (looks, reaches for you, or cries)"; "Smiles or laughs when you play peek-a-boo"
- **Language/communication:** "Makes a lot of different sounds like "mamamama" and "bababababa""; "Lifts arms up to be picked up"
- **Cognitive:** "Looks for objects when dropped out of sight (like his spoon or toy)"; "Bangs two things together"
- **Movement/physical:** "Gets to a sitting position by herself"; "Moves things from one hand to her other hand"; "Uses fingers to "rake" food towards himself"; "Sits without support"
- **Tips (paraphrased):**
  - Place toys just out of reach to encourage crawling, scooting or rolling.
  - Play peek-a-boo, including with a cloth over your head.
  - Stack and dump blocks together.
  - Pass a toy back and forth: "my turn, your turn".
  - Name the pictures in books.
  - Teach gestures such as waving bye-bye.
  - Offer safe objects to pull up on.
  - Stay nearby while the baby explores, and childproof the home.

### 1 year: https://www.cdc.gov/act-early/milestones/1-year.html
- **Social/emotional:** "Plays games with you, like pat-a-cake"
- **Language/communication:** "Waves "bye-bye""; "Calls a parent "mama" or "dada" or another special name"; "Understands "no" (pauses briefly or stops when you say it)"
- **Cognitive:** "Puts something in a container, like a block in a cup"; "Looks for things he sees you hide, like a toy under a blanket"
- **Movement/physical:** "Pulls up to stand"; "Walks, holding on to furniture"; "Drinks from a cup without a lid, as you hold it"; "Picks things up between thumb and pointer finger, like small bits of food"
- **Tips (paraphrased):**
  - Play with blocks and toys that make the baby use their hands.
  - Read books with textures or flaps.
  - Let the baby push safe objects to practise walking. Avoid baby walkers.
  - Encourage walking while holding your hands or sturdy furniture.
  - Baby-proof the home.

### 15 months: https://www.cdc.gov/act-early/milestones/15-months.html
- **Social/emotional:**
  - "Copies other children while playing, like taking toys out of a container when another child does"
  - "Shows you an object she likes"
  - "Claps when excited"
  - "Hugs stuffed doll or other toy"
  - "Shows you affection (hugs, cuddles, or kisses you)"
- **Language/communication:**
  - "Tries to say one or two words besides "mama" or "dada," like "ba" for ball or "da" for dog"
  - "Looks at a familiar object when you name it"
  - "Follows directions given with both a gesture and words …" (WebFetch cut the item short. The page continues with an example of giving a toy when asked.)
  - "Points to ask for something or to get help"
- **Cognitive:** "Tries to use things the right way, like a phone, cup, or book"; "Stacks at least two small objects, like blocks"
- **Movement/physical:** "Takes a few steps on his own"; "Uses fingers to feed herself some food"
- **Tips (paraphrased):**
  - Stack blocks and let the child knock them down.
  - Sing songs with hand movements.
  - Blow bubbles for the child to pop.
  - Play simple hide and seek.
  - Pretend conversations with stuffed animals.
  - Show what to do with objects and see if the child copies.
  - Make a picture book of family and pets.
  - Practise drinking from an open cup and eating with a spoon.
  - Clean up toys together with a song.

### 18 months: https://www.cdc.gov/act-early/milestones/18-months.html
- **Social/emotional:**
  - "Moves away from you, but looks to make sure you are close by"
  - "Points to show you something interesting"
  - "Puts hands out for you to wash them"
  - "Looks at a few pages in a book with you"
  - "Helps you dress him by pushing arm through sleeve or lifting up foot"
- **Language/communication:** "Tries to say three or more words besides "mama" or "dada""; "Follows one-step directions without any gestures, like giving you the toy when you say, "Give it to me.""
- **Cognitive:** "Copies you doing chores, like sweeping with a broom"; "Plays with toys in a simple way, like pushing a toy car"
- **Movement/physical:**
  - "Walks without holding on to anyone or anything"
  - "Scribbles"
  - "Drinks from a cup without a lid and may spill sometimes"
  - "Feeds himself with his fingers"
  - "Tries to use a spoon"
  - "Climbs on and off a couch or chair without help"
- **Tips (paraphrased):**
  - Encourage pretend play, such as feeding a stuffed animal with a spoon, and take turns.
  - Back-and-forth games: roll a ball, push toy cars, pop bubbles.
  - Toys that are safe to push or pull.
  - Pretend-play toys such as a doll and a blanket.
  - Name body parts.
  - Read picture books.

### 2 years: https://www.cdc.gov/act-early/milestones/2-years.html
- **Social/emotional:** "Notices when others are hurt or upset, like pausing or looking sad when someone is crying"; "Looks at your face to see how to react in a new situation"
- **Language/communication:**
  - "Points to things in a book when you ask, like "Where is the bear?""
  - "Says at least two words together, like "More milk.""
  - "Points to at least two body parts when you ask him to show you"
  - "Uses more gestures than just waving and pointing, like blowing a kiss or nodding yes"
- **Cognitive:**
  - "Holds something in one hand while using the other hand; for example, holding a container and taking the lid off"
  - "Tries to use switches, knobs, or buttons on a toy"
  - "Plays with more than one toy at the same time, like putting toy food on a toy plate"
- **Movement/physical:** "Kicks a ball"; "Runs"; "Walks (not climbs) up a few stairs with or without help"; "Eats with a spoon"
- **Tips (paraphrased):**
  - Balls for kicking, rolling and throwing.
  - Toys with buttons or switches.
  - Dress-up clothes for pretend play.
  - Crayons or finger paint.
  - Sand, water and containers in the tub or a sandbox.
  - Simple shape, colour or animal puzzles.
  - Build block towers and knock them down, taking turns.
  - Outdoor games like "ready, set, go".
  - Explore new places together.
  - Watch playdates closely and teach turn-taking.
  - Screens: at most 1 hour a day of children's programming, watched with an adult.

### 30 months: https://www.cdc.gov/act-early/milestones/30-months.html
- **Social/emotional:**
  - "Plays next to other children and sometimes plays with them"
  - "Shows you what she can do by saying, "Look at me!""
  - "Follows simple routines when told, like helping to pick up toys when you say, "It's clean-up time.""
- **Language/communication:**
  - "Says about 50 words"
  - "Says two or more words together, with one action word, like "Doggie run""
  - "Names things in a book when you point and ask, "What is this?""
  - "Says words like "I," "me," or "we""
- **Cognitive:**
  - "Uses things to pretend, like feeding a block to a doll as if it were food"
  - "Shows simple problem-solving skills, like standing on a small stool to reach something"
  - "Follows two-step instructions like "Put the toy down and close the door.""
  - "Shows he knows at least one color, like pointing to a red crayon when you ask, "Which one is red?""
- **Movement/physical:**
  - "Uses hands to twist things, like turning doorknobs or unscrewing lids"
  - "Takes some clothes off by himself, like loose pants or an open jacket"
  - "Jumps off the ground with both feet"
  - "Turns book pages, one at a time, when you read to her"
- **Tips (paraphrased):**
  - Free play.
  - Pretend play, such as cooking with safe kitchen things or turning a big box into a car or house.
  - Drawing: copy lines, then circles.
  - Puzzles.
  - Outdoor play: climbing, running, kicking a ball, "follow the leader".
  - Practise sharing and turn-taking with other children.
  - Use words like big/small, fast/slow, on/off.
  - Screens: at most 1 hour a day, with an adult present.

### 3 years: https://www.cdc.gov/act-early/milestones/3-years.html
- **Social/emotional:** "Calms down within 10 minutes after you leave her, like at a childcare drop off"; "Notices other children and joins them to play"
- **Language/communication:**
  - "Talks with you in conversation using at least two back-and-forth exchanges"
  - "Asks "who," "what," "where," or "why" questions, like "Where is mommy/daddy?""
  - "Says what action is happening in a picture or book when asked, like "running," "eating," or "playing""
  - "Says first name, when asked"
  - "Talks well enough for others to understand, most of the time"
- **Cognitive:** "Draws a circle, when you show him how"; "Avoids touching hot objects, like a stove, when you warn her"
- **Movement/physical:** "Strings items together, like large beads or macaroni"; "Puts on some clothes by himself, like loose pants or a jacket"; "Uses a fork"
- **Tips (paraphrased):**
  - Art supplies, and playdough to build hand strength.
  - Counting, matching and opposites games.
  - Arrange play with other children, and outdoor activities.
  - Use stories or pretend play to prepare for new places.
  - Sing songs and rhymes.
  - Screens: at most 1 hour a day of quality programming with an adult; no screens in the bedroom.

---

## 2. WHO motor development milestones (English)

- **Page:** https://www.who.int/tools/child-growth-standards/standards/motor-development-milestones. It holds links only; the numbers are in these PDFs:
  - Windows table: https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/motor-development-milestones/mm_windows_table.pdf
  - Percentiles table: https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/motor-development-milestones/mm_percentiles_table.pdf
  - Graph: https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/motor-development-milestones/mm_windows_graph.pdf
  - Study paper: https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/motor-development-milestones/who-motor-development-study-windows-of-achievement-for-six-gross-motor-development-milestones.pdf (WHO MGRS Group, *Acta Paediatrica* Suppl 2006;450:86–95)
- **Framing:** windows of achievement bounded by the 1st and 99th percentiles, with no marks inside the window. The paper's conclusion says the windows represent "normal variation in ages of milestone achievement among healthy children". They are recommended "to signal the need for appropriate screening when individual children appear to be late in achieving the milestones".
- **Study:** 816 children aged 4–24 months in Ghana, India, Norway, Oman and the USA. Trained fieldworkers checked them monthly in year 1 and every two months in year 2. Caretakers also recorded the ages themselves.

| Milestone | 1st pct (mo) | Median / 50th (mo) | 99th pct (mo) |
| --- | --- | --- | --- |
| Sitting without support | 3.8 | 5.9 | 9.2 |
| Standing with assistance | 4.8 | 7.4 | 11.4 |
| Hands-and-knees crawling | 5.2 | 8.3 | 13.5 |
| Walking with assistance | 6.0 in the windows table; 5.9 in the percentiles table and the paper | 9.0 | 13.7 |
| Standing alone | 6.9 | 10.8 | 16.9 |
| Walking alone | 8.2 | 12.0 | 17.6 |

Months are days ÷ 30.4375. Other facts from the paper:
- **Crawling isn't universal:** 35 children (4.3%) were never seen crawling on hands and knees. Other studies also report that some children skip it and move another way instead, such as bottom shuffling or crawling on the stomach, which MGRS also observed.
- **Order:** about 90% of children reached five of the milestones in a fixed order: sit, stand with help, walk with help, stand alone, walk alone. Hands-and-knees crawling falls somewhere among the earlier milestones.
- **Window widths:** the narrowest is sitting without support (5.4 months). The widest are walking alone (9.4 months) and standing alone (10.0 months).
- **Still not there at 24 months:** 0.6% for walking with assistance, 2.1% for standing alone, and 2.7% for walking alone.
- The WHO material says nothing about play or the senses.

---

## 3. 1177 (Swedish; translated)

### 3a. Motor milestone table: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/kroppen/tabell-nar-barnet-lar-sig-olika-rorelser/
Last updated 2026-01-07. Editor: Jenny Magnusson Österberg. Reviewer: Anna Hallgren, child nurse. The page names no study behind the table.

| Movement | Age range |
| --- | --- |
| Lifts head when lying on the tummy | 1–5 months |
| Grasps on purpose | 2–6 months |
| Rolls tummy to back or back to tummy | 3–8 months |
| Sits with support | 4–9 months |
| Sits without support | 5–10 months |
| Crawls (some children skip this) | 5–12 months |
| Pulls up and walks holding on to furniture | 6–16 months |
| Walks without support | 8–18 months |
| Pincer grip (thumb and index or middle finger) | 9–12 months |

Surrounding text:
- Children learn movements at different speeds, and siblings can differ too.
- Gross motor skills are rolling, crawling, sitting, standing, walking, jumping and running. Fine motor skills are small movements of the hands and fingers.
- Control develops from the face and neck, to the arms and upper body, to the legs and feet. For example, a baby balances the head before sitting or standing.
- Some children skip stages such as crawling. Some roll early but walk late. Some focus on speech first.
- If you're worried, contact BVC.

### 3b. Development 0–6 months: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/barnets-utveckling/barnets-utveckling-0-6-manader/
Updated 2024-09-02. Reviewers: two psychologists and a paediatrician (Växjö).

**General:**
- Movement develops from the face and neck down to the arms, trunk and legs.
- Babies sleep on their back. Give tummy time several times a day while the baby is awake, and vary the head position to prevent a flat spot at the back of the head.

**0–2 months:**
- Movement:
  - The head is large and needs the support of an adult's hand.
  - Hands are mostly fisted at first, and movements are sudden and jerky.
  - After about a month the baby can balance the head, but only briefly.
  - Late in this band the baby lifts the head briefly on the tummy, stretches the legs backward and starts turning from back to side.
  - Hands start to open and reach out. Grasping on purpose comes about a month later.
- Senses:
  - Smell and taste work from birth. Babies recognise their parent's scent and prefer mild, sweet tastes and smells.
  - Touch is fully developed at birth.
  - Hearing is largely mature by the end of the first month. Babies turn toward sounds, prefer higher voices and are calmed by rhythmic tones.
  - Sight is the least developed sense. Babies see best at about 20 cm and prefer faces (eyes, mouth), high contrast and movement.
  - By 1–2 months babies see colours about as well as adults.
- Play ideas:
  - A mobile with black-and-white contrast or simple patterns. Babies can focus on one thing for about 5–10 seconds.
  - Lean in close, copy the baby's sounds, and exaggerate your expressions. Give the baby time to answer.
  - At about 20 cm, stick out your tongue or open your mouth to invite imitation.
  - A mirror at the changing table or in front of the baby during tummy time.
  - A music box by the changing table.
  - After the bath, rub the baby gently with a towel and say what you're doing.
  - Tummy and back time on a thin mattress or folded blanket.

**2–4 months:**
- Movement:
  - Becomes aware of their own body: fingers and toes.
  - Holds the head steadier and turns it in different directions.
  - On the tummy, lifts the head and props briefly on the forearms.
  - Kicks and stretches the legs.
  - Reaches and grasps with the whole hand. The grasp reflex disappears.
  - Sucks on hands and toys.
  - Can be pulled to sitting with head support.
- Senses:
  - Turns the head toward sounds on purpose, such as a parent's voice.
  - Sight sharpens and eye movements become smoother. Follows objects a few metres away and reaches for things they want.
  - Starts recognising people, things and routines.
- Play ideas:
  - Tummy time during nappy changes or dressing, or on your chest.
  - Let the baby reach for things in front of or above them.
  - Time outdoors, for example the pram under a tree so the baby can touch leaves.
  - Sing and repeat songs.
  - The same short rhyme at every nappy change.

**4–6 months:**
- Movement:
  - Reaches for nearby objects, grasps and lets go, moves them from hand to hand, and brings them to the mouth to explore.
  - On the back, lifts head and shoulders, and sees and plays with the feet.
  - Some prop on the forearms on the tummy and hold a small toy.
  - Some sit fairly steadily with support.
  - Some start moving by kicking or by rolling tummy to back or back to tummy.
  - Crawling-like movement, often scooting forward or backward, trains arm–leg coordination, which lays the ground for walking.
  - Takes weight on the legs when held upright and often enjoys standing on an adult's lap.
- Senses:
  - Explores by touching, tasting and smelling, including a parent's face with hands and mouth.
  - Can look in any direction and focus at different distances. Interested in tiny details such as dust, crumbs and insects.
  - Finds partly hidden objects, and gets frustrated when a toy disappears.
  - Begins to understand cause and effect, for example by dropping things on purpose.
  - Reacts to their name, and notices whether a voice sounds angry or happy.
- Play ideas:
  - A child-safe mirror; peekaboo.
  - Stack small blocks for the baby to knock down.
  - Toys that make sounds.
  - Rhyme games with touch.
  - Roll a ball for the baby to reach for.
  - A play gym.
  - A high chair at the table with safe utensils such as a whisk or spoon.
  - Splashing and kicking in the bath, with an adult there.
  - A soft blanket on the floor with objects to explore with hands, mouth and eyes.
  - Pictures on the wall by the changing table. Babies recognise photos before drawings.

**When to seek help (0–6 months, the only signs listed):** contact BVC or a vårdcentral if the baby:
- screams intensely or in bouts
- is upset most of the day
- screams a lot and eats poorly
- screams and doesn't seem well

**Screens:** Folkhälsomyndigheten's guidelines say no screens at all under 2.

### 3c. Development 6–12 months: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/barnets-utveckling/barnets-utveckling-6-12-manader/
Updated 2024-09-02.

**6–8 months:**
- Movement:
  - Sits for a while without support.
  - Some start to move. Many first scoot backward or spin on the floor. Some roll, scoot on their arms, or bottom-shuffle using one leg.
  - Most try to get up on hands and knees and gradually learn to crawl. Some never crawl.
  - Practising can be frustrating. Children often calm down once a skill is learned.
  - Holds things in both hands and moves them between hands.
  - Explores by shaking, throwing and dropping.
  - Reaches out arms and legs when being dressed.
  - Gets from sitting to crawling position.
  - Holds a spoon handle and picks up food from the plate with the hand.
- Senses and play:
  - Learns through hands and mouth whether things are soft or hard, warm or cold, wet or dry.
  - Enjoys peekaboo and learns that hidden things still exist.
  - Reacts to their name.
- Play ideas:
  - Peekaboo ("tittut").
  - Hide a small toy under a cloth.
  - Put things in and out of a box.
  - Chewable books.
  - Roll a ball back and forth.
  - Describe sounds on walks.
  - Finger rhymes ("Imse Vimse spindel").
- Safety: make the home child-safe before the baby starts moving, for example with socket covers.

**8–10 months:**
- Movement:
  - Some have learned to move forward, for example by crawling. Next comes pulling up on furniture or legs, first to kneeling and then to standing.
  - Moves sideways along furniture. Crawling or scooting is still the safest and fastest way to get around.
  - Practises bending the knees to sit down from standing, holding on to something sturdy.
  - Starts using thumb and index finger to pick up small things (pincer grip). Peas and sweetcorn are good practice. An adult should always be there when the baby handles small things.
  - Scribbles with colour on paper. Picks up and lets go of objects.
- Play and senses:
  - Understands that something exists even when out of sight. Finds a toy hidden under a blanket.
  - Opens cupboards and drawers.
  - Explores by throwing, hitting, sucking and biting.
  - Stacks a couple of blocks and chatters to a teddy or doll.
  - Starts using objects as intended, such as pressing phone or remote buttons.
  - Wants adults or siblings to join in play.
  - Repeats favourite sounds.
  - Enjoys picture books with big colourful pictures of familiar things.
  - Explores how things feel, smell, look, taste and sound.
- Play ideas:
  - Clapping and finger games ("Baka, baka liten kaka").
  - Chase games, crawling after each other.
  - Roll balls to each other.
  - Unwrap parcels together.
  - Toys hidden in boxes to open.
  - Household things as toys: lids, pans, whisks, plastic bottles, rice in a tub.
  - Stack blocks to knock down.
  - Toys with buttons, bells and doors.
  - A pretend phone call.

**10–12 months:**
- Movement:
  - Moves around on their own by crawling, creeping, bottom-shuffling or walking. Many sit up on their own.
  - Balance is fairly good, and many stand briefly without support.
  - Many walk holding someone's hand. Some walk alone before 1 year; most take a few more months.
  - Sits steadily in a high chair, kicks off shoes, and climbs up and down sofas and chairs. Show the child how to go backward down stairs, beds and sofas, with an adult there at first.
  - Some are content to crawl and prefer to sit and play rather than stand or practise walking.
- Play and senses:
  - Repeats activities: stacking, putting in and taking out, matching.
  - Bangs a pegboard or shakes noisy things, learning that actions make results.
  - Loves pouring and emptying. Sand and finger paint are popular.
  - Begins to understand in/out and above/below.
  - Throws things and watches where they land.
  - Understands that pictures stand for real things, and recognises photos before drawings.
  - Enjoys music and sways in time with it.
- Play ideas:
  - Music to sway to, which helps balance for walking.
  - A secure swing.
  - A toy on a string hidden under a chair.
  - Bathe a doll and name its body parts.
  - Finger-painting.
  - Walking on different surfaces (grass, sand, gravel; barefoot on mattresses and cushions).
  - Tins and boxes to fill and empty.
- Safety: stair gates, cupboard locks, and shelves fixed to the wall.

**When to seek help:** no specific warning signs are listed for 6–12 months. The page says to contact BVC, a vårdcentral or the municipality if you're worried, and that you can call 1177 at any time.

### 3d. Development 1–2 years: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/barnets-utveckling/barnets-utveckling-1-2-ar/
Updated 2024-09-02.
- Movement:
  - First steps are often wide-legged and stiff. Children gradually learn to walk, run, climb and jump.
  - They climb chairs and counters and open drawers and cupboards; lock the ones with knives or other dangers.
  - Typical skills: walking and starting to run, standing on tiptoe, kicking a ball, climbing onto a sofa and down unaided, going up and down stairs holding a rail, drawing lines, taking off hats and socks.
  - Builds block towers and knocks them down.
  - Holds crayons with the whole hand.
  - Starts exploring with the fingers rather than the mouth. By about 1 year the pincer grip is fully developed.
  - During a burst of movement learning, other areas such as speech may pause briefly. The page calls this normal.
- Play:
  - Pretend play emerges between 1 and 2 years, for example pretending to eat, or a block as a car. Play gets richer when adults or siblings join in.
  - Copies adults.
  - Enjoys sorting and comparing.
  - Plays side by side with other children rather than together. Adults help with turn-taking.
- Play ideas:
  - A push-along walker for carrying things once the child walks.
  - Sandbox pouring and digging.
  - Bowling at block towers with a ball.
  - A safe place to jump and climb, such as a bed or sofa with a mat and cushions below.
  - Pretend props: toy phone, dress-up clothes, toy stove, pretend food.
  - Chores together.
  - Give-and-take games.
- Senses: no section. Related notes elsewhere on the page: children recognise themselves in mirrors and pictures, and explore with their hands (sand) and with food.
- When to seek help: no specific signs. Seek help if you're worried, from BVC, preschool, a vårdcentral or the municipality.
- Screens: none under 2 (Folkhälsomyndigheten).

### 3e. Development 2–3 years: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/barnets-utveckling/barnets-utveckling-2-3-ar/
Updated 2024-09-02.
- Movement:
  - Learns to run, jump with feet together, stand on one leg, walk backwards and walk on tiptoe.
  - Stairs: first both feet on each step, later one foot per step.
  - Many start learning to ride a tricycle.
  - Typical skills: running and climbing, going up and down stairs, kicking a ball, unscrewing and screwing on lids, turning one page at a time.
  - More common closer to 3: jumping on the spot with both feet, and drawing vertical lines.
  - Movement isn't fully developed yet, so be patient with ball play.
- Hands:
  - Holds pens and brushes with the whole hand.
  - Can use child-safe scissors and build with blocks or large Lego. Often draws circles.
  - Likes thick brushes and bright colours.
  - Makes sand cakes, and pours and splashes water.
- Play:
  - Pretend play develops: a block as a phone, a doll drinking from a cup, then several steps in a row (feed, change, put the doll to bed).
  - Peers matter more, and many start playing with others on their own. Children lend toys but want them back quickly; "mine" and "no" are common words.
  - Short attention span.
  - Sorts by size and colour; does simple puzzles with a few pieces and simple memory games.
- Play ideas:
  - A dress-up box; hand puppets.
  - Chores together.
  - Markers, crayons, finger paint, play dough.
  - Forest play: climbing rocks, stepping over branches.
  - A balance beam; playgrounds.
  - Catch or kick a ball.
  - Pour water between cups and jars.
- Senses: no section.
- When to seek help: no specific signs. Seek help if you're worried (BVC, preschool, vårdcentral, municipality). Links to a page on speech and language difficulties.

### 3f. Play: https://www.1177.se/barn--gravid/sa-vaxer-och-utvecklas-barn/lek-och-sagor/sa-utvecklas-barn-av-att-leka/
Updated 2025-07-03. Reviewer: Monica Lidbeck, psychologist.
- **Under 1 year:**
  - Play grows out of interaction: looking, listening, tasting, feeling, and imitating sounds and movements.
  - Peekaboo, and hiding a toy under a blanket, teach that people and things exist when out of sight.
  - Songs, rhymes, finger and clapping games.
  - With the hands: exploring shapes and materials, sand, pouring and splashing water, blocks into a box, opening and closing a hatch, banging pots with whisks and spoons.
  - Movement: crawling after a ball or pulling a toy cart supports crawling and walking.
- **1–3 years:**
  - Plays beside rather than with peers, and copies adults' tasks.
  - Between 1 and 2 years: pretend play with real-world things (dress-up, pretend cooking).
  - Around 2: explores, compares and sorts, with puzzles, stacking blocks, large Lego or magnetic blocks, train tracks, and feeding and tucking in stuffed animals. Attention spans are short.
  - Movement: outdoor play, running, climbing, tiptoeing, hopping on one foot, balance walking, obstacle courses, ball games, chasing, balance bikes, tricycles.
  - Drawing: finger paint, chalk, thick crayons, thick brushes, clay, stickers.
- **How adults can help:**
  - Play with the child at least 15 minutes a day.
  - Let the child choose and follow their lead.
  - Give play enough uninterrupted time.
  - Make a den under a table with a blanket and cushions.
  - Play outdoors, ideally every day.
  - Step in only if someone risks getting hurt.
- **Warning sign:** a child who doesn't play may be a warning sign, for example of stress or tiredness. Worries such as parents' problems, a move, a separation or a new sibling can affect play. Contact BVC or a vårdcentral.

---

## 4. NHS (English, Open Government Licence)

### 4a. Index: https://www.nhs.uk/baby/babys-development/
Sections: Height, weight and reviews; Teething; Play and learning; Behaviour. There is no movement or senses page. The Play and learning index (https://www.nhs.uk/baby/babys-development/play-and-learning/) only lists its subpages.

### 4b. Baby and toddler play ideas: https://www.nhs.uk/baby/babys-development/play-and-learning/baby-and-toddler-play-ideas/
Last reviewed 2024-08-27.
- **Any age:**
  - Water play with unbreakable household things: bottles, sponges, colanders, funnels.
  - Never leave a young child alone in the bath or playing with water. A baby or young child can drown in less than 5 cm (2 inches) of water.
  - Read to your baby; even 10 minutes a day helps. Babies enjoy the sounds, rhythms and rhymes of language before they can speak.
  - Children learn more from you than from any toy.
- **From 4 months:** talk and sing while holding the baby; put toys within reach so they reach for them; look at baby books together.
- **From 18 months:** drawing and painting (show how to hold the crayon); sock puppets; walk together as soon as the child can (reins are fine for safety).
- **From 24 months:** dressing up (remove cords and ribbons that could strangle or trip); paper-plate masks; limit screen time and watch together.
- **From 30 months:** junk modelling with boxes, pots and child-safe glue.
- **Toy safety:**
  - Don't give toys marked "Not suitable for children under 36 months" to under-3s.
  - Check for sharp edges and small parts.
  - Button batteries can cause choking and severe internal burns. If one is swallowed, go to A&E or call 999.
  - Be careful with second-hand and market-stall toys.
- **Senses:** for children with sight loss, toys with different textures to explore with hands and mouth. For children with hearing loss, toys that stimulate language and link sound to the surroundings. There are no other seeing or hearing facts.

### 4c. How to keep your baby or toddler active: https://www.nhs.uk/baby/babys-development/play-and-learning/keep-baby-or-toddler-active/
Last reviewed 2023-03-09; next review was due 2026-03-09.
- **Babies not yet walking:**
  - Lie them on their back to kick.
  - Pulling, pushing, grasping and playing with others practise different movements.
  - Swimming is fine from very young; you don't need to wait for vaccinations.
  - Play outdoors.
- **Tummy time:**
  - Time on the tummy while awake. You can start from birth on your chest, but only when you are wide awake.
  - Little and often, building up day by day. The page gives no minute amounts.
  - Then move to the floor.
  - If the baby struggles to lift the head, put a rolled towel under the armpits and toys nearby.
  - Only when the baby is awake, alert and supervised.
  - Tummy time builds the muscles for sitting and crawling.
- **Equipment:**
  - Walkers and bouncers encourage standing on tiptoe and can delay walking if used a lot.
  - Long periods in reclining carriers or in seats that prop the baby upright can delay sitting up unaided.
  - Use any walker, bouncer or seat for no more than 20 minutes at a time.
- **Crawling:** once crawling, let the baby crawl on the floor, but check the area is safe first.
- **Toddlers (once walking):**
  - At least 180 minutes (3 hours) of activity a day, spread through the day.
  - Walk rather than always using the buggy.
  - Parks for climbing, swinging and running.
  - Toys to pick up and move.
  - Songs with actions, and dancing.
  - Help with household tasks.
  - Long periods of screen time, or being strapped into a buggy, car seat or highchair, aren't good for young children. Take breaks on long car journeys.
- **Very active toddler:** only a small number of children have ADHD, and an energetic toddler is more likely to be healthy and active. If you're worried, talk to a health visitor or GP.

### 4d. Teaching your child everyday skills: https://www.nhs.uk/baby/babys-development/play-and-learning/teaching-your-child-everyday-skills/
Last reviewed 2026-03-09. Gives no ages. Skills mentioned: potty, washing and dressing, eating with a spoon. Start when the child seems ready; if it doesn't work, wait a few weeks and try again. Setbacks are normal. Don't compare your child with others.

### 4e. Baby reviews: https://www.nhs.uk/baby/babys-development/height-weight-and-reviews/baby-reviews/
Last reviewed 2023-11-30.
- Newborn: physical exam within 72 hours, including the eyes; newborn hearing test.
- 6–8 week GP check includes the eyes.
- 9–12 month review: the ASQ-3 questionnaire is filled in before it.
- 2–2.5 year review: covers movement, speech, social skills and behaviour, hearing and vision, and keeping active.

---

## 5. Rikshandboken barnhälsovård (Swedish, for professionals; translated)

Motor pages are by Kine Johansen (physiotherapist, PhD, Uppsala), fact-checked by Inger Johanne Thuestad (child neurologist, Malmö), approved 2024-10-18. The follow-up pages (`utvecklingsuppfoljning-i-olika-aldrar/...`) were approved 2024-09-20.

### 5a. Motor development index: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/motorisk-utveckling/
Links only. Subpages: 4 v, 6–8 v, 3–5 m, 6 m, 8 m, 10 m, 12–18 m, from 18 m, 2.5–3 y, and "Motoriska svårigheter och funktionsnedsättningar", among others. There is no date on the index page.

### Rule that appears on every motor and follow-up page
When there is a deviation, the BVC:
- asks the parents if it matches what they see
- gives advice on play and stimulation
- follows up at the next visit or an extra visit
- consults the BHV team

**Referral:** "Vid flera avvikelser inom ett eller fler områden eller kvarstående avvikelser över tid" (with several deviations in one or more areas, or deviations that persist over time), the BVC consults or refers to a paediatrician, BHV psychologist, speech therapist or physiotherapist. No numeric age cut-offs are given, apart from the specific items below.

### 4 weeks
- Motor page: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/motorisk-utveckling/motorisk-utveckling-4-veckor/
  - Correct the age for babies born before week 37.
  - Movements should always be symmetrical.
  - Typical: no weight on the feet when held upright. On the back, the head turns to one side and can't be controlled. When held sitting, the head can't be held up and the back is rounded. On the tummy, head and arms rest on the surface.
  - Hands open and close, with no grasping yet.
  - React to: reduced facial expression, few movements, asymmetric movements, stiff arms, tightly clenched fists, thumbs tucked in, stiff legs.
- Follow-up page: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/utvecklingsuppfoljning-i-olika-aldrar/utvecklingsuppfoljning-4-veckor/
  - Expected: arms and legs move symmetrically on the back.
  - Seeing: fixes on and follows a small red ball about 20 cm from the face.
  - Deviation: doesn't fix or follow, or reduced facial expression. Action: prompt follow-up, and if it persists, referral to an eye doctor and a paediatrician.
  - The page has nothing on hearing.

### 6–8 weeks
- Motor page: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/motorisk-utveckling/motorisk-utveckling-6-till-8-veckor/
  - Starts to control movements, makes eye contact, and follows faces and objects (especially moving, sounding or high-contrast ones).
  - On the back: head in the midline and starts turning to follow with the eyes. One side may be easier; encourage turning to the other side.
  - On the tummy: few babies are used to it, so encourage tummy time. Lifts the head briefly and turns it to both sides.
  - Held sitting: head up briefly.
  - Held standing: briefly takes weight on the toes or whole feet.
  - Hands open and close, with no grasping yet.
  - React to the 4-week list, plus the foot pointing down at the ankle.
- Follow-up page: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/utvecklingsuppfoljning-i-olika-aldrar/psykomotorisk-utveckling-6-8-veckor/
  - Expected: lifts the head on the tummy (deviation: doesn't lift it). Opens the hands on the back (deviation: marked asymmetry, stiff arms, clenched hands, thumbs in).
  - Smiles and makes sounds in response. If not, first rule out problems with the senses, with interaction, or the parent's postnatal depression.

### 3–5 months: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/motorisk-utveckling/motorisk-utveckling-3-till-5-manader/
- Likes to touch and grasp things within reach, and mouths objects to learn about hands and objects.
- On the back:
  - Holds the head forward as long as they like and turns it fully both ways.
  - Brings the hands together in front of the body and mouths them.
  - Some start rolling to the side and back on purpose.
  - Lifts the legs, sometimes brings the feet together.
- On the tummy: props on the forearms. Endurance depends on earlier tummy time.
- With support: sits with head and trunk steady in the midline, and takes weight through the whole feet.
- Hands: reaches and grasps with either hand, and uses both equally.
- React to:
  - reduced facial expression, few movements, low endurance, asymmetry
  - stiff arms or legs, clenched fists, thumbs in, foot pointing down
  - tense or spastic movements, uncoordinated movements
  - can't hold the head steady in different positions
  - head lag or generally low muscle tone
  - deviations that get worse when the baby tries to do something on purpose

### 6 months
- Motor page: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/motorisk-utveckling/motorisk-utveckling-6-manader/
  - On the back:
    - Follows objects with the eyes while moving the head freely.
    - Hands work together: turns objects, studies cords and buttons, bangs things to hear the sound.
    - Can roll to the side or all the way onto the tummy.
    - Holds the feet up and plays with them.
  - On the tummy: many babies prefer it. Props on straight arms, or on one arm to reach with the other. Can pivot in a circle.
  - Sitting: sits supported by the arms placed forward; some sit briefly without support.
  - Held standing: takes weight on the whole foot.
  - Hands: grasps with either hand and uses both equally.
  - React to the 3–5 month list, plus shakiness and instability.
- Follow-up page: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/utvecklingsuppfoljning-i-olika-aldrar/psykomotorisk-utveckling-6-manader/
  - Expected: rolls over (on the back, undressed). Deviation: no attempts, including at home. Action: encourage floor play and tummy time.
  - Pull to sit: a deviation if the baby doesn't follow the pull, is limp and the head falls back. **Very low muscle tone alone, or with another deviation, means referral to a paediatrician.**
  - Moves objects between the hands.
  - Looks for a dropped toy (deviation: no reaction when it disappears).
  - Responds with eye contact or sounds when spoken to. Deviation: neither. Action: referral to hearing care depending on the result.

### 8 months: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/motorisk-utveckling/motorisk-utveckling-8-manader/
- Many reach these milestones in this period: rolling, sitting steadily, crawling and sitting up. Toward the end, the child usually doesn't want to lie on the back.
- On the tummy, pushes with the arms and slides backward, which leads to getting up on all fours. Rocking on all fours usually leads to crawling soon after.
- **Not all children crawl; some bottom-shuffle, and movement varies widely. The most important thing is that the child moves.** If a child isn't crawling, consider lack of tummy time, floppy or stiff legs, or something else.
- Hands: used equally, with no side preference.
- React to: the same list as 6 months.

### 10 months
- Motor page: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/motorisk-utveckling/motorisk-utveckling-10-manader/
  - Enjoys crawling into tight spaces and under tables. Most crawl quickly, but patterns vary.
  - Pulls up to stand on furniture.
  - Sits steadily without support with the hands free (stacking blocks, picking up crumbs).
  - Stands holding on with full weight on the whole foot.
  - Hands: the index finger moves on its own, early pincer grip in both hands, both hands used equally.
  - **Hand preference: after 1 year most prefer the right hand, but a stable preference takes several more years. A clear preference should be examined further.**
  - React to the earlier list, plus:
    - marked one-handedness
    - poor coordination between the hands, or between eyes and hands
    - tension when sitting, standing or moving, such as stiff legs or standing on toes
    - little variety in movement
- Follow-up page: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/utvecklingsuppfoljning-i-olika-aldrar/utvecklingsuppfoljning-10-manader/
  - Expected: pulls up to stand and walks holding furniture. Deviation: doesn't move around, low endurance, marked asymmetry, stiffness, foot pointing down, spastic movements. Action: encourage floor play.
  - Pincer grip (picks up a small bead with each hand).
  - Bangs two blocks together, imitating the adult.
  - Understands single words. If not, referral to hearing care depending on the result.
  - Plays peekaboo.

### 12–18 months: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/motorisk-utveckling/motorisk-utveckling-12-manader/
- Moves on their own between all positions.
- Cruises sideways along furniture both ways, then stands alone for a few seconds; walking is near.
- **The age of the first independent steps varies widely and isn't considered important in itself. If a child is late, find out why:** does the child refuse to take weight on the feet? Are the legs stiff?
- Hands: points with the index finger at everything, and has a pincer grip.
- React to the 10-month list, plus reduced ability to move between positions.

### 18 months
- Motor page: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/motorisk-utveckling/motorisk-utveckling-fran-18-manader/
  - By 18 months, children have the basic skills: sitting, standing, walking.
  - Walks steadily, possibly still a little wide-based. Stops and turns without falling. Slopes are still hard.
  - Squats and stands up without support. Some try to run.
  - Sits steadily on a small chair.
  - Hands: some prefer one hand but use both; the pincer grip is quick and secure.
  - **Watch especially for development that has stalled or gone backwards, or newly seen deviations.**
  - Extra follow-up, and consider referral to a physiotherapist or specialist doctor, if any of these apply:
    - delayed, stalled or regressed motor development
    - deviations seen at repeated checks
    - new deviations
    - poor coordination together with clearly poor attention
    - balance difficulties
    - clumsy movements
    - **toe-walking**
    - parents or preschool are worried
- Follow-up page (read from the raw HTML): https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/utvecklingsuppfoljning-i-olika-aldrar/utvecklingsuppfoljning-18-manader/
  - **Gross motor, expected: "Går säkert utan stöd" (walks steadily without support).** Deviations:
    - no locomotion
    - doesn't pull up on furniture
    - abnormal gait
    - stalled or regressed motor development
    - low endurance
  - **Action: referral to a paediatrician and a physiotherapist.**
  - Fine motor: builds a tower of 2–3 blocks; scribbles (dots and lines). Deviations: marked hand asymmetry, tense or uncoordinated or shaky movements. Ask about pencil, cutlery and carrying big things.
  - Language, play and cognition:
    - Says 8–10 words; if not, referral to hearing care depending on the assessment.
    - Understands more than 8–10 words.
    - Understands hide-and-find with a toy wrapped in paper.
    - Points to body parts.
    - Fetches an object when asked.

### 2.5–3 years
- Motor page: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/motorisk-utveckling/motorisk-utveckling-25-till-3-ar/
  - 2.5 years:
    - Relaxed heel-to-toe gait, no longer wide-based.
    - Runs, and stops or turns suddenly without falling.
    - Kicks a ball without falling.
    - Jumps forward on both feet.
    - Hands: palm grip on spoon or pencil. Pours from a small jug into a cup. Throws a ball with direction. Catches a large ball with arms and chest.
  - 3 years:
    - Steps over things; runs fast, changing speed and direction and avoiding obstacles.
    - Climbs stairs without support.
    - Jumps down from a low height and jumps on both feet.
    - Hands: draws a circle; throws and catches a large ball; dresses with some help.
  - Referral criteria: the same as from 18 months, including toe-walking, balance problems, clumsiness, regression, and worried parents or preschool.
- Follow-up page: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/utvecklingsuppfoljning-i-olika-aldrar/utvecklingsuppfoljning--25-och-3-ar/
  - Expected:
    - Jumps on the whole foot without support.
    - Kicks a ball without support or falling.
    - Scribbles a circle after being shown.
    - Simple pretend play ("Drive the car!", "Feed the doll!").
    - Points to and names doll, car, ball and dog.
  - **Play deviation: only explores toys one-sidedly, by mouthing them or banging them on the table.**
  - Hearing is checked through the regional language screening, with referral to hearing care depending on the result. The page has nothing on vision.

### Motor difficulties: https://www.rikshandboken-bhv.se/halsobesok/utvecklingsuppfoljning/motorisk-utveckling/motoriska-svarigheterfunktionsnedsattningar/
- Typical motor development is symmetrical. Note asymmetry early, for example a fixed head-turn preference, one clenched hand, or other side differences, and follow it up with repeated BVC checks. If it persists, consider referral to a doctor or physiotherapist.
- Possible causes: skull asymmetry or torticollis, a collarbone fracture or brachial plexus injury at birth, PEVA (clubfoot), and CP.
- **CP:**
  - The most common cause of motor disability in children.
  - In the first year, look for deviations in several body parts and positions: few movements, stiff arms, clenched hands, thumbs in, stiff legs, foot pointing down, and deviations that get worse with purposeful movement.
- **DCD:**
  - About 5–6% of children, "roughly one per class".
  - Often described as clumsy; they take longer than peers to learn new motor skills.
- For parents: contact your BVC and/or 1177.

---

## Cross-source notes for writing

- **Crawling isn't required.**
  - 1177 table: "some children skip this".
  - 1177 6–12 m: "some never crawl".
  - WHO: 4.3% never crawled on hands and knees.
  - Rikshandboken 8 m: "Not all children crawl … the most important thing is that the child moves."
- **Walking alone:**
  - 1177: 8–18 months.
  - WHO: 8.2–17.6 months, median 12.0.
  - CDC: "Takes a few steps on his own" at 15 months; "Walks without holding on" at 18 months.
  - Rikshandboken: at the 18-month BVC check, not walking steadily without support (or no locomotion, or not pulling up) means referral to a paediatrician and a physiotherapist.
- **Sitting alone:** 1177 5–10 months; WHO 3.8–9.2 months, median 5.9; CDC "Sits without support" at 9 months.
- **Rolling:**
  - 1177: 3–8 months.
  - CDC: "Rolls from tummy to back" at 6 months.
  - Rikshandboken 6 m: expects rolling; no attempts is a deviation, and the advice is floor play and tummy time.
- **Pincer grip:** 1177 9–12 months; CDC at 1 year; Rikshandboken expects it at 10 months (early) and says it is quick and secure by 18 months.
- **Hand preference:**
  - Rikshandboken says a clear one-hand preference at 10 months should be examined further. "Marked one-handedness" is on the deviation lists from 10 months.
  - After 1 year most children prefer the right hand, but a stable preference takes years.
  - At 18 months some prefer one hand but use both.
- **Toe-walking:** a Rikshandboken referral consideration from 18 months, and standing on the toes is a deviation from 10 months.
- **Signs any source gives parents, all ages:**
  - lost skills (CDC: "has lost skills"; Rikshandboken: stalled or regressed development)
  - asymmetry, such as one side moving differently, a fixed head turn or one clenched hand (Rikshandboken)
  - very stiff or very floppy body (Rikshandboken)
  - not fixing on or following with the eyes in the first weeks (Rikshandboken 4 wk)
  - no eye contact or sound response at 6 months (Rikshandboken, hearing referral)
  - a child who doesn't play (1177 play page)
  - parents' worry (CDC "You know your child best. Don't wait."; Rikshandboken "parents and/or preschool are worried")
- **Equipment:** NHS says walkers and bouncers can delay walking and propped-up seats can delay sitting, so use them for at most 20 minutes at a time. CDC says avoid baby walkers and limit time in swings, strollers and bouncy seats.
- **Screens:** Sweden (1177, Folkhälsomyndigheten) says none under 2. CDC says none under 2 except video calls, and at most 1 hour a day with an adult from 2. NHS says limit and watch together from 24 months.
- **Activity:** NHS says at least 180 minutes a day once walking, and tummy time from birth, little and often. 1177's play page says play with the child at least 15 minutes a day and go outdoors daily.
