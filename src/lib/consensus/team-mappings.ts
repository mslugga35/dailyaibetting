// Team name mappings from your ConsensusProject
// Used for standardizing team names before counting consensus

export const teamMappings: Record<string, Record<string, string[]>> = {
  MLB: {
    Diamondbacks: ['Diamondbacks', 'Arizona', 'Dbacks', 'ARI'],
    Braves: ['Braves', 'Atlanta', 'ATL'],
    Orioles: ['Orioles', 'Baltimore', 'BAL'],
    'Red Sox': ['Red Sox', 'Boston', 'BOS'],
    Cubs: ['Cubs', 'Chicago Cubs', 'CHC'],
    'White Sox': ['White Sox', 'Chicago White Sox', 'CWS'],
    Reds: ['Reds', 'Cincinnati', 'CIN'],
    Guardians: ['Guardians', 'Cleveland', 'CLE'],
    Rockies: ['Rockies', 'Colorado', 'COL'],
    Tigers: ['Tigers', 'Detroit', 'DET'],
    Astros: ['Astros', 'Houston', 'HOU'],
    Royals: ['Royals', 'Kansas City', 'KC'],
    Angels: ['Angels', 'Los Angeles Angels', 'LAA'],
    Dodgers: ['Dodgers', 'Los Angeles Dodgers', 'LAD'],
    Marlins: ['Marlins', 'Miami', 'MIA'],
    Brewers: ['Brewers', 'Milwaukee', 'MIL'],
    Twins: ['Twins', 'Minnesota', 'MIN'],
    Yankees: ['Yankees', 'New York Yankees', 'NYY'],
    Mets: ['Mets', 'New York Mets', 'NYM'],
    Athletics: ['Athletics', 'Oakland', "A's", 'OAK'],
    Phillies: ['Phillies', 'Philadelphia', 'PHI'],
    Pirates: ['Pirates', 'Pittsburgh', 'PIT'],
    Padres: ['Padres', 'San Diego', 'SD'],
    Giants: ['Giants', 'San Francisco', 'SF'],
    Mariners: ['Mariners', 'Seattle', 'SEA'],
    Cardinals: ['Cardinals', 'St Louis', 'STL', 'St. Louis'],
    Rays: ['Rays', 'Tampa Bay', 'TB'],
    Rangers: ['Rangers', 'Texas', 'TEX'],
    'Blue Jays': ['Blue Jays', 'Toronto', 'TOR'],
    Nationals: ['Nationals', 'Washington', 'WAS'],
  },
  NBA: {
    Hawks: ['Hawks', 'Atlanta', 'ATL'],
    Celtics: ['Celtics', 'Boston', 'BOS'],
    Nets: ['Nets', 'Brooklyn', 'BKN'],
    Hornets: ['Hornets', 'Charlotte', 'CHA'],
    Bulls: ['Bulls', 'Chicago', 'CHI'],
    Cavaliers: ['Cavaliers', 'Cleveland', 'CLE', 'Cavs'],
    Mavericks: ['Mavericks', 'Dallas', 'DAL', 'Mavs'],
    Nuggets: ['Nuggets', 'Denver', 'DEN'],
    Pistons: ['Pistons', 'Detroit', 'DET'],
    Warriors: ['Warriors', 'Golden State', 'GS', 'GSW'],
    Rockets: ['Rockets', 'Houston', 'HOU'],
    Pacers: ['Pacers', 'Indiana', 'IND'],
    Clippers: ['Clippers', 'Los Angeles Clippers', 'LAC'],
    Lakers: ['Lakers', 'Los Angeles Lakers', 'LAL'],
    Grizzlies: ['Grizzlies', 'Memphis', 'MEM'],
    Heat: ['Heat', 'Miami', 'MIA'],
    Bucks: ['Bucks', 'Milwaukee', 'MIL'],
    Timberwolves: ['Timberwolves', 'Minnesota', 'MIN', 'Wolves'],
    Pelicans: ['Pelicans', 'New Orleans', 'NO', 'NOP'],
    Knicks: ['Knicks', 'New York', 'NY', 'NYK'],
    Thunder: ['Thunder', 'Oklahoma City', 'OKC'],
    Magic: ['Magic', 'Orlando', 'ORL'],
    '76ers': ['76ers', 'Philadelphia', 'PHI', 'Sixers'],
    Suns: ['Suns', 'Phoenix', 'PHX'],
    'Trail Blazers': ['Trail Blazers', 'Portland', 'POR', 'Blazers'],
    Kings: ['Kings', 'Sacramento', 'SAC'],
    Spurs: ['Spurs', 'San Antonio', 'SA', 'SAS'],
    Raptors: ['Raptors', 'Toronto', 'TOR'],
    Jazz: ['Jazz', 'Utah', 'UTA'],
    Wizards: ['Wizards', 'Washington', 'WAS'],
  },
  NFL: {
    Cardinals: ['Cardinals', 'Arizona', 'ARI'],
    Falcons: ['Falcons', 'Atlanta', 'ATL'],
    Ravens: ['Ravens', 'Baltimore', 'BAL'],
    Bills: ['Bills', 'Buffalo', 'BUF'],
    Panthers: ['Panthers', 'Carolina', 'CAR'],
    Bears: ['Bears', 'Chicago', 'CHI'],
    Bengals: ['Bengals', 'Cincinnati', 'CIN'],
    Browns: ['Browns', 'Cleveland', 'CLE'],
    Cowboys: ['Cowboys', 'Dallas', 'DAL'],
    Broncos: ['Broncos', 'Denver', 'DEN'],
    Lions: ['Lions', 'Detroit', 'DET'],
    Packers: ['Packers', 'Green Bay', 'GB'],
    Texans: ['Texans', 'Houston', 'HOU'],
    Colts: ['Colts', 'Indianapolis', 'IND'],
    Jaguars: ['Jaguars', 'Jacksonville', 'JAX', 'JAC'],
    Chiefs: ['Chiefs', 'Kansas City', 'KC'],
    Raiders: ['Raiders', 'Las Vegas', 'LV', 'Oakland'],
    Chargers: ['Chargers', 'Los Angeles Chargers', 'LAC'],
    Rams: ['Rams', 'Los Angeles Rams', 'LAR', 'LA'],
    Dolphins: ['Dolphins', 'Miami', 'MIA'],
    Vikings: ['Vikings', 'Minnesota', 'MIN'],
    Patriots: ['Patriots', 'New England', 'NE'],
    Saints: ['Saints', 'New Orleans', 'NO'],
    'Giants (NFL)': ['Giants', 'New York Giants', 'NYG'],
    'Jets (NFL)': ['Jets', 'New York Jets', 'NYJ'],
    Eagles: ['Eagles', 'Philadelphia', 'PHI'],
    Steelers: ['Steelers', 'Pittsburgh', 'PIT'],
    '49ers': ['49ers', 'San Francisco', 'SF', 'Niners'],
    Seahawks: ['Seahawks', 'Seattle', 'SEA'],
    Buccaneers: ['Buccaneers', 'Tampa Bay', 'TB', 'Bucs'],
    Titans: ['Titans', 'Tennessee', 'TEN'],
    Commanders: ['Commanders', 'Washington', 'WAS'],
  },
  NHL: {
    Ducks: ['Ducks', 'Anaheim', 'ANA'],
    Coyotes: ['Coyotes', 'Arizona', 'ARI', 'Utah Hockey'],
    Bruins: ['Bruins', 'Boston', 'BOS'],
    Sabres: ['Sabres', 'Buffalo', 'BUF'],
    Flames: ['Flames', 'Calgary', 'CGY'],
    Hurricanes: ['Hurricanes', 'Carolina', 'CAR'],
    Blackhawks: ['Blackhawks', 'Chicago', 'CHI'],
    Avalanche: ['Avalanche', 'Colorado', 'COL'],
    'Blue Jackets': ['Blue Jackets', 'Columbus', 'CBJ'],
    Stars: ['Stars', 'Dallas', 'DAL'],
    'Red Wings': ['Red Wings', 'Detroit', 'DET'],
    Oilers: ['Oilers', 'Edmonton', 'EDM'],
    'Panthers (NHL)': ['Panthers', 'Florida', 'FLA'],
    'Kings (NHL)': ['Kings', 'Los Angeles', 'LA'],
    Wild: ['Wild', 'Minnesota', 'MIN'],
    Canadiens: ['Canadiens', 'Montreal', 'MTL', 'Habs'],
    Predators: ['Predators', 'Nashville', 'NSH'],
    Devils: ['Devils', 'New Jersey', 'NJ', 'NJD'],
    Islanders: ['Islanders', 'New York Islanders', 'NYI'],
    'Rangers (NHL)': ['Rangers', 'New York Rangers', 'NYR'],
    Senators: ['Senators', 'Ottawa', 'OTT'],
    Flyers: ['Flyers', 'Philadelphia', 'PHI'],
    Penguins: ['Penguins', 'Pittsburgh', 'PIT'],
    Sharks: ['Sharks', 'San Jose', 'SJ', 'SJS'],
    Kraken: ['Kraken', 'Seattle', 'SEA'],
    Blues: ['Blues', 'St Louis', 'STL', 'St. Louis'],
    Lightning: ['Lightning', 'Tampa Bay', 'TB', 'TBL'],
    'Maple Leafs': ['Maple Leafs', 'Toronto', 'TOR'],
    Canucks: ['Canucks', 'Vancouver', 'VAN'],
    'Golden Knights': ['Golden Knights', 'Vegas', 'VGK'],
    Capitals: ['Capitals', 'Washington', 'WAS', 'Caps'],
    'Jets (NHL)': ['Jets', 'Winnipeg', 'WPG'],
  },
  WNBA: {
    Dream: ['Dream', 'Atlanta'],
    Sky: ['Sky', 'Chicago'],
    Fever: ['Fever', 'Indiana'],
    Sun: ['Sun', 'Connecticut'],
    Wings: ['Wings', 'Dallas'],
    Sparks: ['Sparks', 'Los Angeles'],
    Aces: ['Aces', 'Las Vegas'],
    Lynx: ['Lynx', 'Minnesota'],
    Liberty: ['Liberty', 'New York'],
    Mercury: ['Mercury', 'Phoenix'],
    Storm: ['Storm', 'Seattle'],
    Mystics: ['Mystics', 'Washington'],
  },
  NCAAF: {
    // Add college teams as needed
  },
  NCAAB: {
    // Add college teams as needed
  },
};

/**
 * Standardize a team name to its canonical form
 */
export function standardizeTeamName(team: string, sport: string): string {
  const sportMappings = teamMappings[sport] || {};

  for (const [standardName, variations] of Object.entries(sportMappings)) {
    if (variations.some(v => team.toLowerCase().includes(v.toLowerCase()))) {
      return standardName;
    }
  }

  return team.trim();
}

/**
 * Identify sport from team name
 */
export function identifySport(team: string): string | null {
  for (const [sport, teams] of Object.entries(teamMappings)) {
    for (const variations of Object.values(teams)) {
      if (variations.some(v => team.toLowerCase().includes(v.toLowerCase()))) {
        return sport;
      }
    }
  }
  return null;
}
