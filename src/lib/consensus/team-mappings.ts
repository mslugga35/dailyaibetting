/**
 * Enhanced Team Mappings with HiddenBag-style fuzzy matching
 * 
 * Fixes issues like "Yale Bulldogs" → "Butler" by using more precise matching.
 * Based on HiddenBag's team-aliases.ts but structured for Daily AI.
 */

// Enhanced NCAAB mappings to fix the "Bulldogs" problem
export const teamMappings: Record<string, Record<string, string[]>> = {
  // Existing MLB, NBA, NFL mappings (keeping as-is)
  MLB: {
    Diamondbacks: ['Diamondbacks', 'Arizona', 'Dbacks', 'D-backs', 'ARI', 'AZ'],
    Braves: ['Braves', 'Atlanta', 'ATL'],
    Orioles: ['Orioles', 'Baltimore', 'BAL', "O's"],
    'Red Sox': ['Red Sox', 'Boston', 'BOS', 'BoSox', 'RSox'],
    Cubs: ['Cubs', 'Chicago Cubs', 'CHC', 'Cubbies'],
    'White Sox': ['White Sox', 'Chicago White Sox', 'CWS', 'CHW', 'WSox'],
    Reds: ['Reds', 'Cincinnati', 'CIN'],
    Guardians: ['Guardians', 'Cleveland', 'CLE', 'Guards'],
    Rockies: ['Rockies', 'Colorado', 'COL'],
    Tigers: ['Tigers', 'Detroit', 'DET'],
    Astros: ['Astros', 'Houston', 'HOU', 'Stros'],
    Royals: ['Royals', 'Kansas City', 'KC', 'KCR'],
    Angels: ['Angels', 'Los Angeles Angels', 'LAA', 'Halos', 'Anaheim'],
    Dodgers: ['Dodgers', 'Los Angeles Dodgers', 'LAD'],
    Marlins: ['Marlins', 'Miami', 'MIA', 'Fish'],
    Brewers: ['Brewers', 'Milwaukee', 'MIL', 'Brew Crew'],
    Twins: ['Twins', 'Minnesota', 'MIN'],
    Yankees: ['Yankees', 'New York Yankees', 'NYY', 'Yanks', 'Bronx Bombers'],
    Mets: ['Mets', 'New York Mets', 'NYM'],
    Athletics: ['Athletics', 'Oakland', "A's", 'As', 'OAK'],
    Phillies: ['Phillies', 'Philadelphia', 'PHI', 'Phils'],
    Pirates: ['Pirates', 'Pittsburgh', 'PIT', 'Bucs'],
    Padres: ['Padres', 'San Diego', 'SD', 'SDP', 'Pads'],
    'Giants (MLB)': ['Giants', 'San Francisco', 'SF', 'SFG'],
    Mariners: ['Mariners', 'Seattle', 'SEA', "M's"],
    Cardinals: ['Cardinals', 'St Louis', 'STL', 'St. Louis', 'Cards', 'Redbirds'],
    Rays: ['Rays', 'Tampa Bay', 'TB', 'TBR'],
    'Rangers (MLB)': ['Rangers', 'Texas', 'TEX'],
    'Blue Jays': ['Blue Jays', 'Toronto', 'TOR', 'Jays'],
    Nationals: ['Nationals', 'Washington', 'WAS', 'WSH', 'Nats'],
  },
  
  NBA: {
    Hawks: ['Hawks', 'Atlanta', 'ATL'],
    Celtics: ['Celtics', 'Boston', 'BOS', 'Cs'],
    Nets: ['Nets', 'Brooklyn', 'BKN', 'BRK'],
    Hornets: ['Hornets', 'Charlotte', 'CHA', 'CHO', 'Buzz'],
    Bulls: ['Bulls', 'Chicago', 'CHI'],
    Cavaliers: ['Cavaliers', 'Cleveland', 'CLE', 'Cavs'],
    Mavericks: ['Mavericks', 'Dallas', 'DAL', 'Mavs'],
    Nuggets: ['Nuggets', 'Denver', 'DEN', 'Nugs'],
    Pistons: ['Pistons', 'Detroit', 'DET'],
    Warriors: ['Warriors', 'Golden State', 'GS', 'GSW', 'Dubs'],
    Rockets: ['Rockets', 'Houston', 'HOU', 'Rox'],
    Pacers: ['Pacers', 'Indiana', 'IND'],
    Clippers: ['Clippers', 'Los Angeles Clippers', 'LAC', 'LA Clippers', 'Clips'],
    Lakers: ['Lakers', 'Los Angeles Lakers', 'LAL', 'LA Lakers'],
    Grizzlies: ['Grizzlies', 'Memphis', 'MEM', 'Grizz'],
    Heat: ['Heat', 'Miami', 'MIA'],
    Bucks: ['Bucks', 'Milwaukee', 'MIL'],
    Timberwolves: ['Timberwolves', 'Minnesota', 'MIN', 'Wolves', 'TWolves', "T'Wolves", 'T-Wolves'],
    Pelicans: ['Pelicans', 'New Orleans', 'NO', 'NOP', 'Pels'],
    Knicks: ['Knicks', 'New York', 'NY', 'NYK'],
    Thunder: ['Thunder', 'Oklahoma City', 'OKC'],
    Magic: ['Magic', 'Orlando', 'ORL'],
    '76ers': ['76ers', 'Philadelphia', 'PHI', 'Sixers'],
    Suns: ['Suns', 'Phoenix', 'PHX', 'PHO'],
    'Trail Blazers': ['Trail Blazers', 'Portland', 'POR', 'Blazers'],
    Kings: ['Kings', 'Sacramento', 'SAC'],
    Spurs: ['Spurs', 'San Antonio', 'SA', 'SAS'],
    Raptors: ['Raptors', 'Toronto', 'TOR', 'Raps'],
    Jazz: ['Jazz', 'Utah', 'UTA'],
    Wizards: ['Wizards', 'Washington', 'WAS', 'WSH', 'Wiz'],
  },

  NFL: {
    Cardinals: ['Cardinals', 'Arizona', 'ARI', 'ARZ', 'Cards'],
    Falcons: ['Falcons', 'Atlanta', 'ATL', 'Dirty Birds'],
    Ravens: ['Ravens', 'Baltimore', 'BAL', 'Balt'],
    Bills: ['Bills', 'Buffalo', 'BUF', 'Buff'],
    Panthers: ['Panthers', 'Carolina', 'CAR', 'Caro'],
    Bears: ['Bears', 'Chicago', 'CHI'],
    Bengals: ['Bengals', 'Cincinnati', 'CIN', 'Cincy'],
    Browns: ['Browns', 'Cleveland', 'CLE', 'Clev'],
    Cowboys: ['Cowboys', 'Dallas', 'DAL'],
    Broncos: ['Broncos', 'Denver', 'DEN', 'Denv'],
    Lions: ['Lions', 'Detroit', 'DET'],
    Packers: ['Packers', 'Green Bay', 'GB', 'GNB', 'Pack'],
    Texans: ['Texans', 'Houston', 'HOU', 'Houst'],
    Colts: ['Colts', 'Indianapolis', 'IND', 'Indy'],
    Jaguars: ['Jaguars', 'Jacksonville', 'JAX', 'JAC', 'Jags'],
    Chiefs: ['Chiefs', 'Kansas City', 'KC', 'KAN', 'KCity'],
    Raiders: ['Raiders', 'Las Vegas', 'LV', 'LVR', 'Oak', 'Oakland'],
    Chargers: ['Chargers', 'Los Angeles Chargers', 'LAC', 'LA Chargers'],
    Rams: ['Rams', 'Los Angeles Rams', 'LAR', 'LA Rams'],
    Dolphins: ['Dolphins', 'Miami', 'MIA', 'Phins'],
    Vikings: ['Vikings', 'Minnesota', 'MIN', 'Minn', 'Vikes'],
    Patriots: ['Patriots', 'New England', 'NE', 'NEP', 'Pats'],
    Saints: ['Saints', 'New Orleans', 'NO', 'NOS', 'Nawlins'],
    'Giants (NFL)': ['Giants', 'New York Giants', 'NYG', 'NY Giants'],
    'Jets (NFL)': ['Jets', 'New York Jets', 'NYJ', 'NY Jets'],
    Eagles: ['Eagles', 'Philadelphia', 'PHI', 'Philly'],
    Steelers: ['Steelers', 'Pittsburgh', 'PIT', 'Pitt'],
    '49ers': ['49ers', 'San Francisco', 'SF', 'SFO', 'Niners'],
    Seahawks: ['Seahawks', 'Seattle', 'SEA', 'Hawks'],
    Buccaneers: ['Buccaneers', 'Tampa Bay', 'TB', 'TAM', 'Bucs'],
    Titans: ['Titans', 'Tennessee', 'TEN', 'Tenn'],
    Commanders: ['Commanders', 'Washington', 'WAS', 'WSH', 'Commies'],
  },

  // NCAAB — 281 teams from parse-worker's team-aliases.mjs
  // Generic mascots (Tigers, Eagles, Bears, etc.) removed as standalone aliases
  // Pro sport conflicts (Cavaliers, Spurs, Charlotte, Memphis, Flyers, Thunder) omitted
  NCAAB: {
    'Abilene Christian': ['Abilene Christian', 'Abilene Christian Wildcats', 'ACU', 'AB Christian'],
    'Air Force': ['Air Force', 'Air Force Falcons', 'AF'],
    'Akron': ['Akron', 'Akron Zips', 'AKR'],
    'Alabama': ['Alabama', 'Alabama Crimson Tide', 'Bama', 'Crimson Tide'],
    'Albany': ['Albany', 'Albany Great Danes', 'UAlbany'],
    'Appalachian State': ['Appalachian State', 'Appalachian State Mountaineers', 'App State', 'App St'],
    'Arizona': ['Arizona', 'Arizona Wildcats', 'Zona', 'Ariz'],
    'Arizona State': ['Arizona State', 'Arizona State Sun Devils', 'Arizona St', 'ASU'],
    'Arkansas': ['Arkansas', 'Arkansas Razorbacks', 'Razorbacks', 'ARK'],
    'Arkansas State': ['Arkansas State', 'Arkansas State Red Wolves', 'A-State', 'Arkansas St'],
    'Auburn': ['Auburn', 'Auburn Tigers', 'AUB'],
    'BYU': ['BYU', 'BYU Cougars'],
    'Ball State': ['Ball State', 'Ball State Cardinals', 'Ball'],
    'Baylor': ['Baylor', 'Baylor Bears'],
    'Belmont': ['Belmont', 'Belmont Bruins'],
    'Bethune-Cookman': ['Bethune-Cookman', 'Bethune-Cookman Wildcats', 'Bethune Cookman'],
    'Binghamton': ['Binghamton', 'Binghamton Bearcats', 'Bing'],
    'Boise State': ['Boise State', 'Boise State Broncos', 'Boise St', 'BSU'],
    'Boston College': ['Boston College', 'Boston College Eagles', 'BC'],
    'Boston University': ['Boston University', 'Boston University Terriers', 'Boston U'],
    'Bowling Green': ['Bowling Green', 'Bowling Green Falcons', 'BGSU'],
    'Bradley': ['Bradley', 'Bradley Braves', 'Brad'],
    'Brown': ['Brown', 'Brown Bears'],
    'Bryant': ['Bryant', 'Bryant Bulldogs'],
    'Bucknell': ['Bucknell', 'Bucknell Bison'],
    'Buffalo': ['Buffalo', 'Buffalo Bulls', 'Buff'],
    'Butler': ['Butler', 'Butler Bulldogs'],
    'Cal State Bakersfield': ['Cal State Bakersfield', 'Cal State Bakersfield Roadrunners', 'CS Bakersfield', 'CSUB'],
    'Cal State Fullerton': ['Cal State Fullerton', 'Cal State Fullerton Titans', 'CS Fullerton', 'CSUF', 'Fullerton'],
    'Cal State Northridge': ['Cal State Northridge', 'Cal State Northridge Matadors', 'CSUN'],
    'California': ['California', 'California Golden Bears', 'Cal'],
    'California Baptist': ['California Baptist', 'California Baptist Lancers', 'Cal Baptist', 'CBU'],
    'Campbell': ['Campbell', 'Campbell Fighting Camels'],
    'Canisius': ['Canisius', 'Canisius Golden Griffins', 'CAN'],
    'Central Connecticut': ['Central Connecticut', 'Central Connecticut Blue Devils', 'Central Conn', 'CCSU'],
    'Central Michigan': ['Central Michigan', 'Central Michigan Chippewas', 'CMU'],
    'Charleston': ['Charleston', 'Charleston Cougars', 'College of Charleston'],
    'Charleston Southern': ['Charleston Southern', 'Charleston Southern Buccaneers'],
    'Charlotte': ['Charlotte 49ers', 'Charlotte U', 'CLT'],
    'Chicago State': ['Chicago State', 'Chicago State Cougars', 'Chicago St'],
    'Cincinnati': ['Cincinnati', 'Cincinnati Bearcats', 'Bearcats'],
    'Citadel': ['Citadel', 'Citadel Bulldogs', 'The Citadel'],
    'Clemson': ['Clemson', 'Clemson Tigers', 'Clem'],
    'Cleveland State': ['Cleveland State', 'Cleveland State Vikings'],
    'Coastal Carolina': ['Coastal Carolina', 'Coastal Carolina Chanticleers', 'CCU'],
    'Colgate': ['Colgate', 'Colgate Raiders'],
    'Colorado': ['Colorado', 'Colorado Buffaloes', 'Buffs', 'Colo'],
    'Colorado State': ['Colorado State', 'Colorado State Rams', 'Colorado St', 'CSU'],
    'Coppin State': ['Coppin State', 'Coppin State Eagles'],
    'Cornell': ['Cornell', 'Cornell Big Red'],
    'Creighton': ['Creighton', 'Creighton Bluejays', 'Bluejays', 'Creigh'],
    'Davidson': ['Davidson', 'Davidson Wildcats'],
    'Dayton': ['Dayton', 'Dayton Flyers'],
    'DePaul': ['DePaul', 'DePaul Blue Demons'],
    'Delaware': ['Delaware', 'Delaware Blue Hens'],
    'Drake': ['Drake', 'Drake Bulldogs', 'Drke'],
    'Drexel': ['Drexel', 'Drexel Dragons', 'Dragons'],
    'Duke': ['Duke', 'Duke Blue Devils', 'Blue Devils'],
    'Duquesne': ['Duquesne', 'Duquesne Dukes'],
    'East Carolina': ['East Carolina', 'East Carolina Pirates', 'ECU'],
    'East Tennessee State': ['East Tennessee State', 'East Tennessee State Buccaneers', 'ETSU', 'East Tennessee'],
    'Eastern Illinois': ['Eastern Illinois', 'Eastern Illinois Panthers', 'EIU', 'E Illinois'],
    'Eastern Kentucky': ['Eastern Kentucky', 'Eastern Kentucky Colonels', 'EKU'],
    'Eastern Michigan': ['Eastern Michigan', 'Eastern Michigan Eagles', 'EMU', 'E Michigan'],
    'Eastern Washington': ['Eastern Washington', 'Eastern Washington Eagles', 'EWU', 'E Washington'],
    'Elon': ['Elon', 'Elon Phoenix'],
    'Evansville': ['Evansville', 'Evansville Purple Aces'],
    'FIU': ['FIU', 'FIU Panthers', 'Florida International', 'Florida Intl'],
    'Florida': ['Florida', 'Florida Gators', 'Gators'],
    'Florida Atlantic': ['Florida Atlantic', 'Florida Atlantic Owls', 'FAU'],
    'Florida State': ['Florida State', 'Florida State Seminoles', 'FSU', 'Florida St', 'Seminoles'],
    'Fresno State': ['Fresno State', 'Fresno State Bulldogs', 'Fresno St', 'Fres'],
    'Furman': ['Furman', 'Furman Paladins'],
    'Gardner-Webb': ['Gardner-Webb', 'Gardner-Webb Runnin Bulldogs', 'Gardner Webb'],
    'George Washington': ['George Washington', 'George Washington Colonials', 'GW', 'GWU'],
    'Georgetown': ['Georgetown', 'Georgetown Hoyas', 'Hoyas'],
    'Georgia': ['Georgia', 'Georgia Bulldogs', 'UGA'],
    'Georgia Southern': ['Georgia Southern', 'Georgia Southern Eagles', 'GA Southern'],
    'Georgia State': ['Georgia State', 'Georgia State Panthers', 'GA State'],
    'Georgia Tech': ['Georgia Tech', 'Georgia Tech Yellow Jackets', 'GT'],
    'Gonzaga': ['Gonzaga', 'Gonzaga Bulldogs', 'Zags', 'Gonz'],
    'Grand Canyon': ['Grand Canyon', 'Grand Canyon Antelopes', 'GCU'],
    'Hampton': ['Hampton', 'Hampton Pirates'],
    'Harvard': ['Harvard', 'Harvard Crimson', 'Harv'],
    "Hawai'i": ["Hawai'i", "Hawai'i Rainbow Warriors", 'Hawaii'],
    'High Point': ['High Point', 'High Point Panthers'],
    'Hofstra': ['Hofstra', 'Hofstra Pride'],
    'Houston': ['Houston', 'Houston Cougars'],
    'Houston Christian': ['Houston Christian', 'Houston Christian Huskies', 'HCU', 'HCOU'],
    'IU Indianapolis': ['IU Indianapolis', 'IU Indianapolis Jaguars', 'IU Indy', 'IUPUI'],
    'Idaho': ['Idaho', 'Idaho Vandals'],
    'Idaho State': ['Idaho State', 'Idaho State Bengals', 'Idaho St'],
    'Illinois': ['Illinois', 'Illinois Fighting Illini', 'Illini', 'ILL'],
    'Illinois State': ['Illinois State', 'Illinois State Redbirds', 'IL State', 'ILST'],
    'Indiana': ['Indiana', 'Indiana Hoosiers', 'Hoosiers', 'IU'],
    'Indiana State': ['Indiana State', 'Indiana State Sycamores', 'Indiana St', 'IND State', 'IND St'],
    'Iona': ['Iona', 'Iona Gaels'],
    'Iowa': ['Iowa', 'Iowa Hawkeyes', 'Hawkeyes'],
    'Iowa State': ['Iowa State', 'Iowa State Cyclones', 'Iowa St', 'Cyclones', 'ISU'],
    'Jacksonville': ['Jacksonville', 'Jacksonville Dolphins', 'JVille'],
    'Jacksonville State': ['Jacksonville State', 'Jacksonville State Gamecocks', 'Jax State', 'JKST'],
    'James Madison': ['James Madison', 'James Madison Dukes', 'JMU'],
    'Kansas': ['Kansas', 'Kansas Jayhawks', 'KU', 'Jayhawks'],
    'Kansas State': ['Kansas State', 'Kansas State Wildcats', 'Kansas St', 'K-State', 'KSU'],
    'Kennesaw State': ['Kennesaw State', 'Kennesaw State Owls', 'Kennesaw St'],
    'Kent State': ['Kent State', 'Kent State Golden Flashes', 'Kent St', 'Kent'],
    'Kentucky': ['Kentucky', 'Kentucky Wildcats', 'UK'],
    'LIU': ['LIU', 'LIU Sharks', 'Long Island'],
    'LSU': ['LSU', 'LSU Tigers'],
    'La Salle': ['La Salle', 'La Salle Explorers', 'LaSalle'],
    'Liberty': ['Liberty', 'Liberty Flames'],
    'Lindenwood': ['Lindenwood', 'Lindenwood Lions'],
    'Lipscomb': ['Lipscomb', 'Lipscomb Bisons'],
    'Little Rock': ['Little Rock', 'Little Rock Trojans', 'Arkansas Little Rock', 'UALR'],
    'Long Beach State': ['Long Beach State', 'Long Beach State Beach', 'Long Beach St', 'LBSU'],
    'Longwood': ['Longwood', 'Longwood Lancers'],
    'Louisville': ['Louisville', 'Louisville Cardinals', 'LOU'],
    'Loyola Chicago': ['Loyola Chicago', 'Loyola Chicago Ramblers', 'Ramblers', 'LoyChI'],
    'Loyola Marymount': ['Loyola Marymount', 'Loyola Marymount Lions', 'LMU'],
    'Manhattan': ['Manhattan', 'Manhattan Jaspers'],
    'Marist': ['Marist', 'Marist Red Foxes'],
    'Marquette': ['Marquette', 'Marquette Golden Eagles', 'Marq'],
    'Marshall': ['Marshall', 'Marshall Thundering Herd'],
    'Maryland': ['Maryland', 'Maryland Terrapins', 'Terps', 'MD'],
    'Maryland Eastern Shore': ['Maryland Eastern Shore', 'Maryland Eastern Shore Hawks', 'MD Eastern', 'UMES'],
    'Massachusetts': ['Massachusetts', 'Massachusetts Minutemen', 'UMass', 'UMass Amherst'],
    'Memphis': ['Memphis', 'Memphis Tigers'],
    'Merrimack': ['Merrimack', 'Merrimack Warriors'],
    'Miami (OH)': ['Miami OH', 'Miami (OH)', 'Miami Ohio', 'Miami-OH', 'Miami RedHawks', 'RedHawks'],
    'Michigan': ['Michigan', 'Michigan Wolverines', 'Wolverines', 'Mich'],
    'Michigan State': ['Michigan State', 'Michigan State Spartans', 'Michigan St', 'MSU', 'Spartans'],
    'Middle Tennessee': ['Middle Tennessee', 'Middle Tennessee Blue Raiders', 'MTSU'],
    'Milwaukee': ['Milwaukee', 'Milwaukee Panthers', 'Wisconsin Milwaukee', 'UWM'],
    'Minnesota': ['Minnesota', 'Minnesota Golden Gophers', 'Gophers', 'Minn'],
    'Mississippi State': ['Mississippi State', 'Mississippi State Bulldogs', 'Mississippi St', 'Miss St', 'MSST'],
    'Mississippi Valley State': ['Mississippi Valley State', 'Mississippi Valley State Delta Devils', 'MVST', 'Miss Valley St'],
    'Missouri': ['Missouri', 'Missouri Tigers', 'Mizzou'],
    'Missouri State': ['Missouri State', 'Missouri State Bears', 'MO St'],
    'Monmouth': ['Monmouth', 'Monmouth Hawks'],
    'Montana': ['Montana', 'Montana Grizzlies'],
    'Montana State': ['Montana State', 'Montana State Bobcats', 'Montana St'],
    'Morehead State': ['Morehead State', 'Morehead State Eagles', 'Morehead St'],
    'Morgan State': ['Morgan State', 'Morgan State Bears'],
    "Mount St. Mary's": ["Mount St. Mary's", "Mount St. Mary's Mountaineers", 'Mt St Marys'],
    'Murray State': ['Murray State', 'Murray State Racers', 'Murray St'],
    'NC State': ['NC State', 'NC State Wolfpack', 'NCST', 'Wolfpack'],
    'NJIT': ['NJIT', 'NJIT Highlanders'],
    'Navy': ['Navy', 'Navy Midshipmen'],
    'Nebraska': ['Nebraska', 'Nebraska Cornhuskers', 'Neb'],
    'Nevada': ['Nevada', 'Nevada Wolf Pack'],
    'New Mexico': ['New Mexico', 'New Mexico Lobos', 'UNM', 'Lobos', 'NM'],
    'New Mexico State': ['New Mexico State', 'New Mexico State Aggies', 'NMSU', 'NM State'],
    'North Carolina': ['North Carolina', 'North Carolina Tar Heels', 'UNC', 'Tar Heels'],
    'North Carolina A&T': ['North Carolina A&T', 'North Carolina A&T Aggies', 'NC A&T', 'NCAT'],
    'North Carolina Central': ['North Carolina Central', 'North Carolina Central Eagles', 'NC Central'],
    'North Dakota': ['North Dakota', 'North Dakota Fighting Hawks', 'UND'],
    'North Dakota State': ['North Dakota State', 'North Dakota State Bison', 'NDSU', 'N Dakota St', 'NDST'],
    'North Texas': ['North Texas', 'North Texas Mean Green', 'UNT'],
    'Northeastern': ['Northeastern', 'Northeastern Huskies'],
    'Northern Arizona': ['Northern Arizona', 'Northern Arizona Lumberjacks', 'NAU'],
    'Northern Colorado': ['Northern Colorado', 'Northern Colorado Bears', 'UNCO'],
    'Northern Illinois': ['Northern Illinois', 'Northern Illinois Huskies', 'NIU'],
    'Northern Iowa': ['Northern Iowa', 'Northern Iowa Panthers', 'UNI', 'N Iowa'],
    'Northern Kentucky': ['Northern Kentucky', 'Northern Kentucky Norse', 'NKU'],
    'Northwestern': ['Northwestern', 'Northwestern Wildcats', 'NW'],
    'Notre Dame': ['Notre Dame', 'Notre Dame Fighting Irish', 'Irish', 'ND'],
    'Oakland': ['Oakland', 'Oakland Golden Grizzlies'],
    'Ohio': ['Ohio', 'Ohio Bobcats', 'OH'],
    'Ohio State': ['Ohio State', 'Ohio State Buckeyes', 'Ohio St', 'OSU', 'Buckeyes'],
    'Oklahoma': ['Oklahoma', 'Oklahoma Sooners', 'Sooners', 'OU'],
    'Oklahoma State': ['Oklahoma State', 'Oklahoma State Cowboys', 'Oklahoma St', 'OKST'],
    'Ole Miss': ['Ole Miss', 'Ole Miss Rebels', 'Mississippi'],
    'Oregon': ['Oregon', 'Oregon Ducks', 'ORE'],
    'Oregon State': ['Oregon State', 'Oregon State Beavers', 'Oregon St'],
    'Penn': ['Penn', 'Penn Quakers', 'Pennsylvania'],
    'Penn State': ['Penn State', 'Penn State Nittany Lions', 'Penn St', 'PSU'],
    'Pittsburgh': ['Pittsburgh', 'Pittsburgh Panthers', 'Pitt'],
    'Portland State': ['Portland State', 'Portland State Vikings', 'Portland St'],
    'Princeton': ['Princeton', 'Princeton Tigers'],
    'Providence': ['Providence', 'Providence Friars', 'Friars'],
    'Purdue': ['Purdue', 'Purdue Boilermakers', 'Boilermakers', 'Purd'],
    'Purdue Fort Wayne': ['Purdue Fort Wayne', 'Purdue Fort Wayne Mastodons', 'PFW'],
    'Rhode Island': ['Rhode Island', 'Rhode Island Rams', 'URI'],
    'Rice': ['Rice', 'Rice Owls'],
    'Richmond': ['Richmond', 'Richmond Spiders'],
    'Rider': ['Rider', 'Rider Broncs'],
    'Rutgers': ['Rutgers', 'Rutgers Scarlet Knights', 'Rutg'],
    'SE Missouri State': ['SE Missouri State', 'SE Missouri State Redhawks', 'Southeastern Missouri', 'SEMO'],
    'SMU': ['SMU', 'SMU Mustangs'],
    'Sacramento State': ['Sacramento State', 'Sacramento State Hornets', 'Cal State Sacramento', 'CS Sacramento', 'Sac State'],
    'Sacred Heart': ['Sacred Heart', 'Sacred Heart Pioneers', 'SHU'],
    'Saint Bonaventure': ['Saint Bonaventure', 'Saint Bonaventure Bonnies', 'St Bonaventure', 'St Bona'],
    'Saint Francis': ['Saint Francis', 'Saint Francis Red Flash'],
    "Saint Mary's": ["Saint Mary's", "Saint Mary's Gaels", 'Saint Marys', 'SMC', 'Gaels'],
    "Saint Peter's": ["Saint Peter's", "Saint Peter's Peacocks", 'St Peters'],
    'Sam Houston': ['Sam Houston', 'Sam Houston Bearkats', 'Sam Houston State', 'SHSU'],
    'Samford': ['Samford', 'Samford Bulldogs'],
    'San Diego': ['San Diego', 'San Diego Toreros'],
    'San Diego State': ['San Diego State', 'San Diego State Aztecs', 'SDSU', 'Aztecs'],
    'San Francisco': ['San Francisco Dons', 'SF Dons', 'USF'],
    'Santa Clara': ['Santa Clara', 'Santa Clara Broncos'],
    'Seattle': ['Seattle Redhawks', 'Seattle U'],
    'Seton Hall': ['Seton Hall', 'Seton Hall Pirates', 'Seton'],
    'Shelton State': ['Shelton State', 'Shelton State Buccaneers', 'Shelton'],
    'Siena': ['Siena', 'Siena Saints'],
    'South Alabama': ['South Alabama', 'South Alabama Jaguars'],
    'South Carolina': ['South Carolina', 'South Carolina Gamecocks', 'Gamecocks'],
    'South Carolina State': ['South Carolina State', 'South Carolina State Bulldogs', 'SC State'],
    'South Dakota': ['South Dakota', 'South Dakota Coyotes', 'USD'],
    'South Dakota State': ['South Dakota State', 'South Dakota State Jackrabbits', 'South Dakota St'],
    'South Florida': ['South Florida', 'South Florida Bulls'],
    'Southern': ['Southern', 'Southern Jaguars'],
    'Southern Illinois': ['Southern Illinois', 'Southern Illinois Salukis', 'SIU'],
    'Southern Indiana': ['Southern Indiana', 'Southern Indiana Screaming Eagles', 'USI'],
    'Southern Miss': ['Southern Miss', 'Southern Miss Golden Eagles', 'USM'],
    "St. John's": ["St. John's", "St. John's Red Storm", 'St Johns', 'Saint Johns', 'SJU', 'Johnnies'],
    'St. Thomas': ['St. Thomas', 'St. Thomas Tommies', 'St Thomas'],
    'Stanford': ['Stanford', 'Stanford Cardinal', 'Stan'],
    'Stony Brook': ['Stony Brook', 'Stony Brook Seawolves', 'Seawolves'],
    'Syracuse': ['Syracuse', 'Syracuse Orange', 'Cuse', 'SYR'],
    'TCU': ['TCU', 'TCU Horned Frogs', 'Horned Frogs'],
    'Tarleton State': ['Tarleton State', 'Tarleton State Texans', 'Tarleton', 'Tarleton St'],
    'Temple': ['Temple', 'Temple Owls'],
    'Tennessee': ['Tennessee', 'Tennessee Volunteers', 'Vols', 'Tenn'],
    'Tennessee State': ['Tennessee State', 'Tennessee State Tigers'],
    'Tennessee Tech': ['Tennessee Tech', 'Tennessee Tech Golden Eagles', 'Tenn Tech'],
    'Texas': ['Texas', 'Texas Longhorns', 'Longhorns'],
    'Texas A&M-CC': ['Texas A&M Corpus Christi', 'Texas A&M Corpus Christi Islanders', 'TAMUCC', 'Texas A&M Corpus'],
    'Texas State': ['Texas State', 'Texas State Bobcats', 'TXST'],
    'Texas Tech': ['Texas Tech', 'Texas Tech Red Raiders', 'TTU', 'Red Raiders'],
    'Toledo': ['Toledo', 'Toledo Rockets', 'TOL'],
    'Tulane': ['Tulane', 'Tulane Green Wave', 'Green Wave'],
    'Tulsa': ['Tulsa', 'Tulsa Golden Hurricane'],
    'UAB': ['UAB', 'UAB Blazers'],
    'UC Riverside': ['UC Riverside', 'UC Riverside Highlanders', 'Cal Riverside'],
    'UC San Diego': ['UC San Diego', 'UC San Diego Tritons', 'UCSD'],
    'UC Santa Barbara': ['UC Santa Barbara', 'UC Santa Barbara Gauchos', 'UCSB'],
    'UCF': ['UCF', 'UCF Knights', 'Central Florida'],
    'UCLA': ['UCLA', 'UCLA Bruins'],
    'UConn': ['UConn', 'UConn Huskies', 'Connecticut', 'Conn'],
    'UIC': ['UIC', 'UIC Flames', 'Illinois Chicago'],
    'UL Lafayette': ['UL Lafayette', 'UL Lafayette Ragin Cajuns', 'Louisiana Lafayette', 'Ragin Cajuns'],
    'UL Monroe': ['UL Monroe', 'UL Monroe Warhawks', 'Louisiana Monroe', 'ULM'],
    'UMKC': ['UMKC', 'UMKC Kangaroos'],
    'UMass Lowell': ['UMass Lowell', 'UMass Lowell River Hawks'],
    'UNC Greensboro': ['UNC Greensboro', 'UNC Greensboro Spartans', 'UNCG'],
    'UNC Wilmington': ['UNC Wilmington', 'UNC Wilmington Seahawks', 'UNCW', 'NC Wilmington'],
    'UNLV': ['UNLV', 'UNLV Rebels'],
    'USC': ['USC', 'USC Trojans', 'Trojans'],
    'USC Upstate': ['USC Upstate', 'USC Upstate Spartans'],
    'UT Arlington': ['UT Arlington', 'UT Arlington Mavericks', 'Texas Arlington'],
    'UT Martin': ['UT Martin', 'UT Martin Skyhawks', 'Martin'],
    'UTEP': ['UTEP', 'UTEP Miners'],
    'UTSA': ['UTSA', 'UTSA Roadrunners'],
    'Utah': ['Utah', 'Utah Utes', 'Utes'],
    'Utah State': ['Utah State', 'Utah State Aggies', 'Utah St', 'USU'],
    'Utah Tech': ['Utah Tech', 'Utah Tech Trailblazers'],
    'Utah Valley': ['Utah Valley', 'Utah Valley Wolverines', 'UVU'],
    'VCU': ['VCU', 'VCU Rams', 'Virginia Commonwealth'],
    'VMI': ['VMI', 'VMI Keydets'],
    'Valparaiso': ['Valparaiso', 'Valparaiso Beacons', 'Valpo'],
    'Vanderbilt': ['Vanderbilt', 'Vanderbilt Commodores', 'Vandy'],
    'Vermont': ['Vermont', 'Vermont Catamounts'],
    'Villanova': ['Villanova', 'Villanova Wildcats', 'Nova', 'Vill'],
    'Virginia': ['Virginia', 'Virginia Cavaliers', 'UVA'],
    'Virginia Tech': ['Virginia Tech', 'Virginia Tech Hokies', 'VT', 'Hokies', 'VA Tech'],
    'Wake Forest': ['Wake Forest', 'Wake Forest Demon Deacons', 'Wake'],
    'Washington': ['Washington', 'Washington Huskies', 'Wash'],
    'Washington State': ['Washington State', 'Washington State Cougars', 'Washington St', 'WSU'],
    'Weber State': ['Weber State', 'Weber State Wildcats', 'Weber St'],
    'West Virginia': ['West Virginia', 'West Virginia Mountaineers', 'WVU'],
    'Western Kentucky': ['Western Kentucky', 'Western Kentucky Hilltoppers', 'WKU'],
    'Western Michigan': ['Western Michigan', 'Western Michigan Broncos', 'WMU'],
    'Wichita State': ['Wichita State', 'Wichita State Shockers', 'Wichita St', 'Shockers'],
    'William & Mary': ['William & Mary', 'William & Mary Tribe', 'William and Mary', 'William Mary', 'W&M'],
    'Wisconsin': ['Wisconsin', 'Wisconsin Badgers', 'Badgers', 'Wisc'],
    'Wright State': ['Wright State', 'Wright State Raiders', 'Wright'],
    'Wyoming': ['Wyoming', 'Wyoming Cowboys', 'WYO'],
    'Xavier': ['Xavier', 'Xavier Musketeers'],
    'Yale': ['Yale', 'Yale Bulldogs'],
    'Youngstown State': ['Youngstown State', 'Youngstown State Penguins', 'YSU'],
  },
};

/**
 * Normalize team name for matching (from HiddenBag)
 */
function normalizeForMatch(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

/**
 * Clean team name by removing common prefixes that interfere with matching
 */
function cleanTeamName(name: string): string {
  if (!name) return name;
  
  let cleaned = name.trim();
  
  // Remove common prefixes that cause mismatches
  cleaned = cleaned.replace(/^(OF THE DAY|PICK OF THE DAY|POTD|BET LABS?)\s+/i, '');
  cleaned = cleaned.replace(/^(LIVE|TONIGHT|TODAY)\s+/i, '');
  
  // Remove betting info suffixes
  cleaned = cleaned.replace(/\s+[-+]\d+\.?\d*\s+[-+]\d+\s+at\s+\w+.*$/i, ''); // "Team -4½ -118 at DraftKings"
  cleaned = cleaned.replace(/\s+[-+]\d+\.?\d*\s+at\s+\w+.*$/i, ''); // "Team +4 at Buckeye"
  cleaned = cleaned.replace(/\s+at\s+\w+.*$/i, ''); // "Team at Sportsbook"
  
  return cleaned.trim();
}

/**
 * Enhanced team standardization with fuzzy matching
 * 
 * Priority order:
 * 1. Exact match in team mappings
 * 2. Check if input contains canonical team name
 * 3. Check individual words (but be careful with generic words)
 * 4. Last word matching (mascot)
 * 5. Partial matching
 */
export function standardizeTeamName(input: string, sport?: string): string {
  if (!input || input.trim() === '') return input;
  
  // First clean the input to remove problematic prefixes/suffixes
  const cleanedInput = cleanTeamName(input);
  const cleanInput = normalizeForMatch(cleanedInput);
  const inputWords = cleanInput.split(/\s+/);
  
  // Filter to only search relevant sport(s)
  const sportsToSearch = sport ? [sport.toUpperCase()] : Object.keys(teamMappings);
  
  for (const sportKey of sportsToSearch) {
    if (!teamMappings[sportKey]) continue;
    
    // Stage 1: Exact alias match
    for (const [canonical, aliases] of Object.entries(teamMappings[sportKey])) {
      for (const alias of aliases) {
        if (normalizeForMatch(alias) === cleanInput) {
          return canonical;
        }
      }
    }
    
    // Stage 2: Input contains canonical name (STRICT - no partial matches)
    // Sort by canonical name length (longest first) to match specific names before generic ones
    const sortedEntries = Object.entries(teamMappings[sportKey])
      .sort(([a], [b]) => b.length - a.length);
    
    for (const [canonical, aliases] of sortedEntries) {
      const canonicalNorm = normalizeForMatch(canonical);
      // Only exact match or input starts with canonical
      if (cleanInput === canonicalNorm || 
          (cleanInput.startsWith(canonicalNorm + ' ') && canonicalNorm.length >= 4)) {
        return canonical;
      }
    }
    
    // Stage 3: Check for specific school name first (avoid generic mascot matches)
    for (const [canonical, aliases] of Object.entries(teamMappings[sportKey])) {
      for (const alias of aliases) {
        const aliasNorm = normalizeForMatch(alias);
        // Skip generic mascot words unless it's the full input
        if (['bulldogs', 'tigers', 'eagles', 'bears', 'wildcats'].includes(aliasNorm) 
            && cleanInput !== aliasNorm) {
          continue;
        }
        
        // STRICT matching - only exact or input starts with alias
        if (cleanInput === aliasNorm || 
            (cleanInput.startsWith(aliasNorm + ' ') && aliasNorm.length >= 4)) {
          return canonical;
        }
      }
    }
    
    // Stage 4: Word-by-word matching (careful with short/generic words)
    for (const word of inputWords) {
      if (word.length <= 2) continue; // Skip very short words
      
      for (const [canonical, aliases] of Object.entries(teamMappings[sportKey])) {
        for (const alias of aliases) {
          if (normalizeForMatch(alias) === word) {
            return canonical;
          }
        }
      }
    }
  }
  
  // Return original if no match found
  return input;
}

/**
 * Generic mascots that appear across many teams — skip these as standalone
 * words to avoid cross-sport confusion (e.g. "Tigers" in MLB/NCAAB/NCAAF)
 */
const GENERIC_MASCOTS = new Set([
  'tigers', 'eagles', 'bears', 'wildcats', 'bulldogs', 'panthers',
  'cardinals', 'lions', 'hawks', 'rams', 'warriors', 'rockets',
  'rebels', 'pirates', 'cougars', 'huskies', 'knights', 'falcons',
]);

/**
 * Identify sport from team name using strict matching.
 *
 * Rules (in priority order):
 * 1. Exact match — normalized alias equals normalized input
 * 2. Prefix match — input starts with alias + space (4+ char aliases only)
 * 3. Word match — single-word alias (3+ chars) exact-matches a word in input,
 *    but skip generic mascots that appear across multiple sports
 */
export function identifySport(teamName: string): string {
  if (!teamName || teamName.trim().length === 0) return 'OTHER';

  const cleanName = normalizeForMatch(teamName);
  const inputWords = cleanName.split(/\s+/);

  // Pass 1: Exact match (highest confidence)
  for (const [sport, teams] of Object.entries(teamMappings)) {
    for (const [, aliases] of Object.entries(teams)) {
      for (const alias of aliases) {
        if (normalizeForMatch(alias) === cleanName) {
          return sport;
        }
      }
    }
  }

  // Pass 2: Prefix match — input starts with alias + space (4+ char aliases)
  for (const [sport, teams] of Object.entries(teamMappings)) {
    for (const [, aliases] of Object.entries(teams)) {
      for (const alias of aliases) {
        const aliasNorm = normalizeForMatch(alias);
        if (aliasNorm.length >= 4 && cleanName.startsWith(aliasNorm + ' ')) {
          return sport;
        }
      }
    }
  }

  // Pass 3: Word match — single-word alias matches a word in input
  for (const [sport, teams] of Object.entries(teamMappings)) {
    for (const [, aliases] of Object.entries(teams)) {
      for (const alias of aliases) {
        const aliasNorm = normalizeForMatch(alias);
        // Only single-word aliases, 3+ chars, not generic mascots
        if (aliasNorm.length >= 3 && !aliasNorm.includes(' ') &&
            !GENERIC_MASCOTS.has(aliasNorm) &&
            inputWords.includes(aliasNorm)) {
          return sport;
        }
      }
    }
  }

  return 'OTHER';
}
