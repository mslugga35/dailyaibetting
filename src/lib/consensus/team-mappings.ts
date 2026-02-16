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

  // ENHANCED NCAAB section - Fix the "Bulldogs" problem
  NCAAB: {
    // Major programs with precise matching
    'North Carolina': ['North Carolina', 'UNC', 'Tar Heels', 'North Carolina Tar Heels'],
    Duke: ['Duke', 'Blue Devils', 'Duke Blue Devils'],
    Kentucky: ['Kentucky', 'UK', 'Wildcats', 'Kentucky Wildcats'],
    Kansas: ['Kansas', 'KU', 'Jayhawks', 'Kansas Jayhawks'],
    Gonzaga: ['Gonzaga', 'Zags', 'Bulldogs', 'Gonzaga Bulldogs'],
    
    // FIX: Specific Bulldogs teams (most important fix!)
    Butler: ['Butler', 'Butler Bulldogs', 'Butler University'],  // Only Butler = Butler
    'Gonzaga': ['Gonzaga Bulldogs', 'Gonzaga'],  // Gonzaga Bulldogs = Gonzaga
    'Yale': ['Yale', 'Yale Bulldogs', 'Yale University'],  // Yale Bulldogs = Yale  
    'Drake': ['Drake', 'Drake Bulldogs', 'Drake University'],  // Drake Bulldogs = Drake
    'Georgia': ['Georgia Bulldogs', 'Georgia', 'UGA'],  // Georgia Bulldogs = Georgia
    'Mississippi State': ['Mississippi State Bulldogs', 'Mississippi State', 'MSU', 'Miss State'],
    'Fresno State': ['Fresno State Bulldogs', 'Fresno State', 'Fresno'],
    'Louisiana Tech': ['Louisiana Tech Bulldogs', 'Louisiana Tech', 'La Tech'],
    'South Carolina State': ['South Carolina State', 'South Carolina State Bulldogs', 'SC State'],
    
    // FIX: Problematic mappings identified in API
    'Stanford': ['Stanford', 'Stanford Cardinal', 'Cardinal'],
    'Boston University': ['Boston University', 'Boston U', 'BU Terriers'],
    'Texas A&M Corpus Christi': ['Texas A&M Corpus Christi', 'Texas A&M Corpus', 'TAMUCC', 'Islanders'],
    'Marshall': ['Marshall', 'Marshall Thundering Herd', 'Thundering Herd'],
    'Dayton': ['Dayton', 'Dayton Flyers', 'Flyers'],
    'Northern Iowa': ['Northern Iowa', 'UNI', 'Panthers', 'Northern Iowa Panthers'],
    
    // More NCAAB teams
    Auburn: ['Auburn', 'Tigers', 'Auburn Tigers'],
    Alabama: ['Alabama', 'Bama', 'Crimson Tide', 'Alabama Crimson Tide'],
    UConn: ['UConn', 'Connecticut', 'Huskies', 'UConn Huskies'],
    Purdue: ['Purdue', 'Boilermakers', 'Purdue Boilermakers'],
    Tennessee: ['Tennessee', 'Vols', 'Volunteers', 'Tennessee Volunteers'],
    Houston: ['Houston', 'Cougars', 'Houston Cougars'],
    'Iowa State': ['Iowa State', 'Cyclones', 'Iowa State Cyclones'],
    Marquette: ['Marquette', 'Golden Eagles', 'Marquette Golden Eagles'],
    Creighton: ['Creighton', 'Bluejays', 'Creighton Bluejays'],
    Villanova: ['Villanova', 'Nova', 'Wildcats', 'Villanova Wildcats'],
    Baylor: ['Baylor', 'Bears', 'Baylor Bears'],
    'Michigan State': ['Michigan State', 'MSU', 'Spartans', 'Michigan State Spartans'],
    Michigan: ['Michigan', 'Wolverines', 'Michigan Wolverines'],
    Indiana: ['Indiana', 'IU', 'Hoosiers', 'Indiana Hoosiers'],
    Texas: ['Texas', 'Longhorns', 'Texas Longhorns'],
    Arkansas: ['Arkansas', 'Razorbacks', 'Arkansas Razorbacks'],
    Florida: ['Florida', 'Gators', 'Florida Gators'],
    'Ohio State': ['Ohio State', 'OSU', 'Buckeyes', 'Ohio State Buckeyes'],
    Syracuse: ['Syracuse', 'Cuse', 'Orange', 'Syracuse Orange'],
    Louisville: ['Louisville', 'Cardinals', 'Louisville Cardinals'],
    UCLA: ['UCLA', 'Bruins', 'UCLA Bruins'],
    Arizona: ['Arizona', 'Wildcats', 'Arizona Wildcats'],
    USC: ['USC', 'Trojans', 'USC Trojans'],
    Oregon: ['Oregon', 'Ducks', 'Oregon Ducks'],
    Iowa: ['Iowa', 'Hawkeyes', 'Iowa Hawkeyes'],
    Wisconsin: ['Wisconsin', 'Badgers', 'Wisconsin Badgers'],
    Virginia: ['Virginia', 'UVA', 'Cavaliers', 'Virginia Cavaliers'],
    Georgetown: ['Georgetown', 'Hoyas', 'Georgetown Hoyas'],
    "St. John's": ["St. John's", "St Johns", 'Red Storm', "St. John's Red Storm"],
    Memphis: ['Memphis', 'Tigers', 'Memphis Tigers'],
    'Seton Hall': ['Seton Hall', 'Pirates', 'Seton Hall Pirates'],
    Xavier: ['Xavier', 'Musketeers', 'Xavier Musketeers'],
    Cincinnati: ['Cincinnati', 'Bearcats', 'Cincinnati Bearcats'],
    'West Virginia': ['West Virginia', 'WVU', 'Mountaineers', 'West Virginia Mountaineers'],
    Pittsburgh: ['Pittsburgh', 'Pitt', 'Panthers', 'Pittsburgh Panthers'],
    'Ole Miss': ['Ole Miss', 'Rebels', 'Ole Miss Rebels'],
    LSU: ['LSU', 'Tigers', 'LSU Tigers'],
    'South Carolina': ['South Carolina', 'Gamecocks', 'South Carolina Gamecocks'],
    TCU: ['TCU', 'Horned Frogs', 'TCU Horned Frogs'],
    'Texas Tech': ['Texas Tech', 'Red Raiders', 'Texas Tech Red Raiders'],
    Oklahoma: ['Oklahoma', 'Sooners', 'Oklahoma Sooners'],
    'Oklahoma State': ['Oklahoma State', 'OK State', 'Cowboys', 'Oklahoma State Cowboys'],
    'Kansas State': ['Kansas State', 'K State', 'Wildcats', 'Kansas State Wildcats'],
    Colorado: ['Colorado', 'Buffs', 'Buffaloes', 'Colorado Buffaloes'],
    'San Diego State': ['San Diego State', 'SDSU', 'Aztecs', 'San Diego State Aztecs'],
    UNLV: ['UNLV', 'Rebels', 'UNLV Rebels'],
    'Boise State': ['Boise State', 'Broncos', 'Boise State Broncos'],
    
    // Ivy League  
    Harvard: ['Harvard', 'Crimson', 'Harvard Crimson'],
    Princeton: ['Princeton', 'Tigers', 'Princeton Tigers'],
    Penn: ['Penn', 'Pennsylvania', 'Quakers', 'Pennsylvania Quakers'],
    Cornell: ['Cornell', 'Big Red', 'Cornell Big Red'],
    Columbia: ['Columbia', 'Lions', 'Columbia Lions'],
    Brown: ['Brown', 'Bears', 'Brown Bears'],
    Dartmouth: ['Dartmouth', 'Big Green', 'Dartmouth Big Green'],
    
    // Mid-majors
    'VCU': ['VCU', 'Rams', 'VCU Rams'],
    'George Mason': ['George Mason', 'Patriots', 'George Mason Patriots'],
    'Old Dominion': ['Old Dominion', 'ODU', 'Monarchs', 'Old Dominion Monarchs'],
    'James Madison': ['James Madison', 'JMU', 'Dukes', 'James Madison Dukes'],
    'William & Mary': ['William & Mary', 'Tribe', 'William & Mary Tribe'],
    
    // MAC 
    Ohio: ['Ohio', 'Bobcats', 'Ohio Bobcats'],
    'Miami (OH)': ['Miami OH', 'Miami-OH', 'Miami (OH)', 'RedHawks', 'Miami RedHawks'],
    'Kent State': ['Kent State', 'Golden Flashes', 'Kent State Golden Flashes'],
    'Bowling Green': ['Bowling Green', 'BGSU', 'Falcons', 'Bowling Green Falcons'],
    Toledo: ['Toledo', 'Rockets', 'Toledo Rockets'],
    Akron: ['Akron', 'Zips', 'Akron Zips'],
    
    // More specific teams to prevent mismatches
    'Saint Mary\'s': ['Saint Mary\'s', 'Saint Marys', 'Gaels', 'Saint Mary\'s Gaels'],
    Iona: ['Iona', 'Gaels', 'Iona Gaels'],  // Fix: Iona ≠ Saint Mary's
    'UMass': ['UMass', 'Massachusetts', 'Minutemen', 'Massachusetts Minutemen'],
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
 * Identify sport from team name (enhanced)
 */
export function identifySport(teamName: string): string {
  const cleanName = normalizeForMatch(teamName);
  
  for (const [sport, teams] of Object.entries(teamMappings)) {
    for (const [canonical, aliases] of Object.entries(teams)) {
      for (const alias of aliases) {
        if (normalizeForMatch(alias) === cleanName || 
            cleanName.includes(normalizeForMatch(alias)) ||
            normalizeForMatch(alias).includes(cleanName)) {
          return sport;
        }
      }
    }
  }
  
  return 'OTHER';
}/ /   F o r c e   r e b u i l d   0 2 / 1 6 / 2 0 2 6   1 4 : 3 2 : 4 1 
 
 