import { Pokedex } from "./pokedex.js";
import { Learnsets } from "./learnsets.js";

//TODO: Add Warning for Protect on pokemon that can learn Detect or other Protect varients
//TODO: Add Help Page: Include where to find information for teamsheet and information on Showdown Export Format

function getNature(nature) {
    let arr = [1,1,1,1,1,1];
    let natures = [
        ['Hardy', 'Lonely', 'Adamant', 'Naughty', 'Brave'],
        ['Bold', 'Docile', 'Impish', 'Lax', 'Relaxed'],
        ['Modest', 'Mild', 'Bashful', 'Rash', 'Quiet'],
        ['Calm', 'Gentle', 'Careful', 'Quirky', 'Sassy'],
        ['Timid', 'Hasty', 'Jolly', 'Naive', 'Serious']];
    for(let row = 0; row < 5; row++) {
        for(let col = 0; col < 5; col++) {
            if(natures[row][col] == nature) {
                if(row != col) {
                    arr[row+1] = 1.1;
                    arr[col+1] = 0.9;
                    return arr;
                }
            }
        }
    }
    return arr;
}

function getStats(name, evs, ivs, nature, level) {
    name = name.toLowerCase().replace(/[ -]/, '').trim();
    let bs = Pokedex[getNormalName(name)].baseStats;
    let baseStats = [bs['hp'], bs['atk'], bs['def'], bs['spa'], bs['spd'], bs['spe']];
    let stats = [0,0,0,0,0,0];
    nature = getNature(nature);
    if(baseStats[0] == 1)
        stats[0] = 1;
    else
        stats[0] = Math.floor(((2*baseStats[0]+ivs[0]+Math.floor(evs[0]/4))*level)/100)+level+10;
    for(let i = 1; i < 6; i++) {
        stats[i] = Math.floor(Math.floor((((2*baseStats[i]+ivs[i]+Math.floor(evs[i]/4))*level)/100)+5)*nature[i]);
    }
    return stats;
}

function parseLine(line, teamIndex) {
    let pairs = [];
    line = line.replace(/\((M|F)\)/, '').trim();
    let index = line.indexOf(':');
    let stats = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe']
    if(line.includes('Ability:')) {
        pairs.push(['ability', line.substring(index+1).trim()]);
    } else if(line.includes('Level:')) {
        pairs.push(['level', parseInt(line.substring(index+1))]);
    } else if(line.includes('Tera Type:')) {
        pairs.push(['tera', line.substring(index+1).trim()]);
    } else if(line.includes('EVs:')) {
        let evs = [0,0,0,0,0,0]
        let i = 0
        let total = 0;
        stats.forEach(stat => {
            let s = line.indexOf(stat);
            if(s != -1) {
                let num = parseInt(line.substring(s-4, s).replace(/[/:]/, ''));
                if(num > 252 || num < 0)
                    if(errorChecking)
                        throw new Error('Invalid EV Value (Slot ' + (teamIndex+1).toString() + ') [' + (num).toString() + ' ' + stat + ']');
                total += num;
                evs[i] = num;
            }
            i++;
        });
        if(total > 510)
            if(errorChecking)
                throw new Error('Invalid EV Total (Slot ' + (teamIndex+1).toString() + ') [' + (total).toString() + ']');
        pairs.push(['evs', evs]);
    } else if(line.includes('IVs')) {
        let ivs = [31,31,31,31,31,31]
        let i = 0
        stats.forEach(stat => {
            let s = line.indexOf(stat);
            if(s != -1) {
                let num = parseInt(line.substring(s-3, s).replace(/[/:]/, ''));
                if(num > 31 || num < 0)
                    throw new Error('Invalid IV Value (Slot ' + (teamIndex+1).toString() + ') [' + (num).toString() + ' ' + stat + ']');
                ivs[i] = num;
            }
            i++;
        });
        pairs.push(['ivs', ivs]);
    } else if(line.includes('Nature')) {
        let temp = line.indexOf(' ');
        pairs.push(['nature', line.substring(0, temp)]);
    } else if(line[0] == '-') {
        line = line.replace(/[-]/, '').trim();
        pairs.push(['moves', line]);
    } else if(index == -1) {
        let at = line.indexOf('@')
        let start = line.indexOf('(')
        if(at != -1)
            pairs.push(['item', line.substring(at+2)]);
        if(start != -1) {
            let end = line.indexOf(')')
            pairs.push(['name', line.substring(start+1, end).trim()]);
        }
        else if(at != -1)
            pairs.push(['name', line.substring(0, at).trim()]);
        else
            pairs.push(['name', line.trim()]);
    }
    return pairs;
}

function checkValidMove(entry) {
    return entry.some(gen => gen.charAt(0) === '9');
}

function checkValidMoves(slot, name, pokemonEntry, learnset, moves, movesLen) {
    for(let m = 0; m < movesLen; m++) {
        let moveEntry = getNormalName(moves[m])
        let validMove = false;
        if(!learnset) {
            let baseSpecies = entryP['baseSpecies'];
            if(!baseSpecies)
                throw new Error('Can\'t find learnset for ' + getFormalName(name) + ' (Slot ' + (slot+1).toString() + ')')
            entryL = Learnsets[getNormalName(baseSpecies)]
            learnset = entryL['learnset'];
            if(!learnset)
                throw new Error('Can\'t find learnset for ' + getFormalName(name) + ' (Slot ' + (slot+1).toString() + ')')
        }
        let prevo;
        do {
            let validGensArr = learnset[moveEntry];
            if(moveEntry in learnset) {
                validMove = checkValidMove(validGensArr);
            }
            prevo = pokemonEntry['prevo'];
            if(prevo) {
                pokemonEntry = Pokedex[getNormalName(prevo)];
                learnset = Learnsets[getNormalName(prevo)]['learnset'];
            }
        } while (!validMove && prevo);
        if(!validMove) {
            throw new Error('Invalid Move (Slot ' + (slot+1).toString() + ', Move ' + (m+1).toString() + ')')
        }
    }
}

function parseTeam() {
    let team = [];
    let append = true;
    let i = -1;
    let lines = document.getElementById('teamPaste').value.split('\n');
    lines.push('\n');
    try {
        lines.forEach(line => {
            line = line.trim();
            if(line == '') {
                if(i >= 0) {
                    let name = team[i].get('name');
                    let ability = team[i].get('ability');
                    if(!name) {
                        if(errorChecking)
                            throw new Error('No Species (Slot ' + (i+1).toString() + ')');
                    }
                    if(name.toLowerCase().includes('terapagos')) {
                        name = 'Terapagos';
                        ability = 'Tera Shift';
                    }
                    else if(name.toLowerCase().includes('zacian')) {
                        name = 'Zacian';
                        let movesLen = team[i].get('moves').length;
                        for(let moveIndex = 0; moveIndex < movesLen; moveIndex++) {
                            if(getNormalName(team[i].get('moves')[moveIndex]).includes('behemoth')) {
                                team[i].get('moves')[moveIndex] = 'Iron Head';
                            }
                        }
                    }
                    else if(name.toLowerCase().includes('zamazenta')) {
                        name = 'Zamazenta';
                        let movesLen = team[i].get('moves').length;
                        for(let moveIndex = 0; moveIndex < movesLen; moveIndex++) {
                            if(getNormalName(team[i].get('moves')[moveIndex]).includes('behemoth')) {
                                team[i].get('moves')[moveIndex] = 'Iron Head';
                            }
                        }
                    }
                    else if(name.toLowerCase().includes('calyrex')) {
                        ability = 'As One';
                    }
                    team[i].set('name', name);
                    team[i].set('ability', ability);
                    let entryP = Pokedex[getNormalName(name)];
                    let entryL = Learnsets[getNormalName(name)];
                    if(!entryP) {
                        if(errorChecking)
                            throw new Error('Invalid Species (Slot ' + (i+1).toString() + ')');
                    }
                    let tera = team[i].get('tera');
                    if(!tera) {
                        if('forceTeraType' in entryP) {
                            team[i].set('tera', entryP.forceTeraType);
                        }
                        else {
                            team[i].set('tera', entryP.types[0]);
                        }
                    }
                    else {
                        if('forceTeraType' in entryP) {
                            if(entryP.forceTeraType.toLowerCase() != tera.toLowerCase()) {
                                if(errorChecking)
                                    throw new Error('Invalid Tera Type (Slot ' + (i+1).toString() + ')');
                            }
                        }
                    }
                    if(!ability) {
                        team[i].set('ability', entryP.abilities['0']);
                    }
                    else {
                        let valid = false;
                        for(const [key, value] of Object.entries(entryP.abilities)) {
                            let v = value;
                            if(v.includes('(')) {
                                v = v.substring(0,value.indexOf('(')-1).trim();
                            }
                            if(ability.toLowerCase() == v.toLowerCase()) {
                                valid = true;
                                break;
                            }
                        }
                        if(!valid) {
                            if(errorChecking)
                                throw new Error('Invalid Ability (Slot ' + (i+1).toString() + ')');
                        }
                    }
                    let movesLen = team[i].get('moves').length;
                    if(movesLen < 1 || movesLen > 4) {
                        if(errorChecking)
                            throw new Error('Invalid Number of Moves (Slot ' + (i+1).toString() + ')');
                    }

                    if(errorChecking) {
                        checkValidMoves(i, name, entryP, entryL['learnset'], team[i].get('moves'), movesLen);
                    }
                }
                append = true;
            } else {
                if(append) {
                    i++;
                    team.push(new Map());
                    team[i].set('moves', []);
                    team[i].set('level', 100);
                    team[i].set('ivs', [31,31,31,31,31,31]);
                    team[i].set('evs', [0,0,0,0,0,0]);
                    team[i].set('nature', 'Serious');
                    team[i].set('item', 'No Item');
                    append = false;
                }
                let pairs = parseLine(line, i);
                pairs.forEach(pair => {
                    if(pair[0] == 'moves') {
                        team[i].get('moves').push(pair[1]);
                    } else {
                        team[i].set(pair[0], pair[1]);
                    }
                });
            }
        });
    } catch(e) {
        return e;
    }
    if(team.length == 0) {
        if(errorChecking) {
            return new Error('No Pokemon');
        }
    }
    return team;
}

function getRegion(num) {
    if(num <= 151)
        return 'Kanto';
    if(num <= 251)
        return 'Johto';
    if(num <= 386)
        return 'Hoenn';
    if(num <= 493)
        return 'Sinnoh';
    if(num <= 649)
        return 'Unova';
    if(num <= 721)
        return 'Kalos';
    if(num <= 809)
        return 'Alola';
    if(num <= 898)
        return 'Galar';
    if(num <= 905)
        return 'Hisui';
    if(num <= 1025)
        return 'Paldea';
}

function normalize(name) {
    return name.toLowerCase().normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').replaceAll(/[ -]/g, '').trim()
}

function getNormalName(name) {
    name = normalize(name);
    let mons = ['burmy', 'shellos', 'gastrodon', 'deerling', 'sawsbuck', 'vivillon', 'flabebe', 'floette', 'florges', 'furfrou', 'minior', 'alcremie', 'tatsugiri']
    mons.forEach(mon => {
        if(name.includes(mon)) {
            name = mon;
        }
    });
    return name;
}

function getFormalName(name) {
    let normalName = getNormalName(name);
    let normalized = normalize(name);
    let entry = Pokedex[normalName];
    if(normalName == normalized) {
        if('baseForme' in entry) { // add baseForme if necessary
            let baseForme = entry.baseForme;
            let excludes = ['Overcast', 'Standard', 'Meadow', 'Shield', 'Active', 'Solo', 'Disguised', 'Vanilla Cream', 'Zero', 'Hero']
            let excluded = false;
            excludes.forEach(e => {
                if(baseForme == e)
                    excluded = true;
            });
            if(!excluded) {
                name += ' ' + baseForme;
            }
        }
        else { // add regional forme if necessary
            if('otherFormes' in entry) {
                let regions_formes = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Hisui', 'Paldea', 'Bloodmoon']
                entry.otherFormes.forEach(forme => {
                    regions_formes.forEach(rf => {
                        if(forme.includes(rf)) {
                            name += ' ' + getRegion(entry.num);
                        }
                    });
                });
            }
        }
    }
    let dash = ['chien-pao', 'chi-yu', 'ting-lu', 'wo-chien', 'ho-oh', 'porygon-z', 'jangmo-o', 'hakamo-o', 'kommo-o'];
    let excluded = false;
    dash.forEach(d => {
        if(name.toLowerCase() == d)
            excluded = true;
    });
    if(!excluded)
        name = name.replaceAll('-', ' ');
    return name;
}

function createPDF() {
    errorChecking = document.getElementById('eswitch').checked;
    let team = parseTeam();
    document.getElementById('error').innerText = '';
    if(team instanceof Error) {
        document.getElementById('error').innerText = team.toString();
    } else {
        const pdf = new jsPDF({format: 'letter'});
        var hcenter = 215.9/2;
        var t1 = 12.95356;

        var playerName = document.getElementById('name').value;
        var trainerName = document.getElementById('trainer').value;
        var teamName = document.getElementById('teamNumber').value;
        var switchName = document.getElementById('switchProfile').value;
        var ageDivision = document.querySelector('input[name="ageDivision"]:checked').value;
        var birthday = document.getElementById('birthday').value;
        var playerId = document.getElementById('playerID').value;

        pdf.addFileToVFS('calibri-normal.ttf', normal);
        pdf.addFont('calibri-normal.ttf', 'calibri', 'normal');
        pdf.addFileToVFS('calibri-bold.ttf', bold);
        pdf.addFont('calibri-bold.ttf', 'calibrib', 'bold');
        pdf.addFileToVFS('calibri-bolditalic.ttf', bolditalic);
        pdf.addFont('calibri-bolditalic.ttf', 'calibriz', 'bolditalic');

        for(let counter = 0; counter < 2; counter++) {
            if(counter == 1) {
                pdf.addPage('letter', 'p');
            }
            pdf.setFontSize(7);
            pdf.setFont("calibri", 'normal');
            var msg = "All Pokémon must be listed exactly as they appear in the Battle Team,";
            var s1 = 69.486197917
            var s2 = 33.591059701
            pdf.text(hcenter - s2/2 - 0.69, 272, msg, 'center');

            pdf.setFont("calibrib", 'bold');
            var msg = "at the level they are in the game.";
            pdf.text(hcenter - (s1 + s2)/2 + s1 + 0.06, 272, msg);

            pdf.setFontSize(13);
            pdf.setFont("calibrib", 'bold');
            var msg = "Pokémon Video Game Team List";
            pdf.text(hcenter, 12.5, msg, 'center');

            pdf.setLineWidth(0.3);
            var x = 45;
            var y = 34.5;
            var mygap = 7;
            for (let i = 0; i < 4; i++) {
                pdf.line(x, y+mygap*i, x+65, y+mygap*i);
            }

            pdf.setFontSize(12);
            pdf.setFont("calibrib", 'bold');

            var msg = "Player Name: ";
            pdf.text(45, 33, msg, "right");

            pdf.setFontSize(9);

            var msg = "Trainer Name in Game: ";
            pdf.text(45, 40, msg, "right");

            var msg = "Battle Team Number / Name: ";
            pdf.text(45, 47, msg, "right");

            var msg = "Switch Profile Name: ";
            pdf.text(45, 54, msg, "right");

            var x = 155;
            var gapx = 21;
            for (let i = 0; i < 3; i++) {
                pdf.rect(x + gapx * i, 30, 4, 4);
            }

            var msg = "Age Division: ";
            pdf.text(140, 33, msg, "right");
            var msg = "Juniors ";
            pdf.text(154, 33, msg, "right");
            var msg = "Seniors ";
            pdf.text(175, 33, msg, "right");
            var msg = "Masters ";
            pdf.text(196, 33, msg, "right");

            pdf.setFont("calibri", 'normal');
            pdf.setFontSize(13);
            pdf.text(playerName, 47, 33);
            pdf.text(trainerName, 47, 40);
            pdf.text(teamName, 47, 47);
            pdf.text(switchName, 47, 54);

            for (let i = 0; i < 6; i++) {
                pdf.setLineWidth(0.6);
                var x = 10.95 + 99 * (i%2);
                var y = 59.5 + 70 * Math.floor(i/2);
                pdf.rect(x, y, 95, 68);

                pdf.setLineWidth(0.3);
                var startY = 12;
                var mygap = 8;
                for (let b = 0; b < 7; b++) {
                    pdf.line(x, y+startY+mygap*b, x+95, y+startY+mygap*b);
                }
            }

            if (ageDivision >= 0) {
                pdf.setLineWidth(1);
                var posX = 155 + 21 * ageDivision;
                pdf.rect(posX, 30, 4, 4, 'f');
            }

            for (let i = 0; i < 6; i++) {
                var textX = 35;
                var gapX = 100;
                var textXX = 27.5 + 4.45;

                var pokeY = 67;
                var teraY = pokeY + 9.5;
                var abilityY = pokeY + 18;
                var itemY = pokeY + 26;
                var gapY = 70;

                var moveY = pokeY + 34;
                var moveGapY = 8;

                var statY = pokeY + 19;
                var statGapY = 8;

                pdf.setFontSize(13);
                pdf.setFont("calibrib", 'bold');
                pdf.text("Pokémon", textXX + (i%2) * gapX, pokeY + (Math.floor(i/2)) * gapY, "right");
                pdf.text("Tera Type", textXX + (i%2) * gapX, teraY + (Math.floor(i/2)) * gapY, "right");
                pdf.text("Ability", textXX + (i%2) * gapX, abilityY + (Math.floor(i/2)) * gapY, "right");
                pdf.text("Held Item", textXX + (i%2) * gapX, itemY + (Math.floor(i/2)) * gapY, "right");
                for (let j = 0; j < 4; j++) {
                    pdf.text("Move " + (j+1), textXX + (i%2) * gapX, moveY + (Math.floor(i/2)) * gapY + j * moveGapY, "right");
                }

                if(team.length > i) {
                    pdf.setFont("calibri", 'normal');
                    pdf.text(getFormalName(team[i].get('name')), textX + (i%2) * gapX, pokeY + (Math.floor(i/2)) * gapY);
                    pdf.text(team[i].get('tera'), textX + (i%2) * gapX, teraY + (Math.floor(i/2)) * gapY);
                    pdf.text(team[i].get('ability'), textX + (i%2) * gapX, abilityY + (Math.floor(i/2)) * gapY);
                    pdf.text(team[i].get('item'), textX + (i%2) * gapX, itemY + (Math.floor(i/2)) * gapY);
                    let moves = team[i].get('moves');
                    for (let j = 0; j < 4; j++) {
                        if(j<moves.length) {
                            pdf.text(moves[j], textX + (i%2) * gapX, moveY + (Math.floor(i/2)) * gapY + j * moveGapY);
                        }
                    }
                }
            }
            if (counter == 0) {
                pdf.setFontSize(13);
                pdf.setFont("calibrib", 'bold');
                var msg = "1 of 2: ";
                let t2 = 40.15603164;
                pdf.text(hcenter - (t1+t2)/2, 18, msg);
        
                pdf.setFont("calibriz", 'bolditalic');
                var msg = "For Tournament Staff";
                pdf.text(hcenter - (t1+t2)/2 + t1, 18, msg);
        
                pdf.setFontSize(10);
                pdf.setFont("calibriz", 'bolditalic');
                var msg = "Complete both pages of this document. Submit this page to event staff before the tournament, at the time set by the Organizer.";
                pdf.text(hcenter, 24, msg, 'center');
        
                pdf.setLineWidth(0.3);
                pdf.setFontSize(9);
                pdf.setFont("calibrib", 'bold');
                var msg = "Player ID: ";
                pdf.text(140, 43, msg, "right");
                pdf.line(140, 44.5, 180, 44.5);
                pdf.setFontSize(13);
                pdf.setFont("calibri", 'normal');
                pdf.text(playerId, 142, 43);
        
                pdf.setFontSize(9);
                pdf.setFont("calibrib", 'bold');
                var msg = "Date of Birth: ";
                pdf.text(140, 51, msg, "right");
                pdf.line(140, 52.5, 180, 52.5);
                pdf.setFontSize(13);
                pdf.setFont("calibri", 'normal');
                pdf.text(birthday, 142, 51);
        
                for (let i = 0; i < 6; i++) {
                    pdf.setLineWidth(0.3);
                    var x = 6.5 + 99 * (i%2);
                    var y = 59.5 + 70 * Math.floor(i/2);
        
                    pdf.line(x+80, y+12, x+80, y+68);
                    pdf.setFontSize(5);
                    pdf.setFont("calibrib", 'bold');
                    pdf.text(x+81, y+14, "Level");
                    pdf.text(x+81, y+22, "HP");
                    pdf.text(x+81, y+30, "Atk");
                    pdf.text(x+81, y+38, "Def");
                    pdf.text(x+81, y+46, "Sp. Atk");
                    pdf.text(x+81, y+54, "Sp. Def");
                    pdf.text(x+81, y+62, "Speed");
                    pdf.setFontSize(13);
                    pdf.setFont("calibri", 'normal');
                    if(team.length > i) {
                        var stats = getStats(team[i].get('name'), team[i].get('evs'), team[i].get('ivs'), team[i].get('nature'), team[i].get('level'));
                        pdf.text(team[i].get('level').toString(), (x+80+105.95)/2 + (i%2) * (gapX-1) * 0.5, statY + (Math.floor(i/2)) * gapY + (-1*statGapY), 'center');
                        for(let j = 0; j < 6; j++) {
                            pdf.text(stats[j].toString(), (x+80+105.95)/2 + (i%2) * (gapX-1) * 0.5, statY + (Math.floor(i/2)) * gapY + j * statGapY, 'center');
                        }
                    }
                }
            }
            else if (counter == 1) {
                pdf.setFontSize(13);
                pdf.setFont("calibrib", 'bold');
                var msg = "2 of 2: ";
                let t2 = 27.908;
                pdf.text(hcenter - (t1+t2)/2, 18, msg);
        
                pdf.setFont("calibriz", 'bolditalic');
                var msg = "For Opponents";
                pdf.text(hcenter - (t1+t2)/2 + t1, 18, msg);
        
                pdf.setFontSize(10);
                pdf.setFont("calibriz", 'bolditalic');
                var msg = "Do not lose this page! Keep it throughout the tournament, sharing it with your opponent each round.";
                pdf.text(hcenter, 24, msg, 'center');
            } 
        }
        if(teamName == '') {
            pdf.save("OTS.pdf");
        }
        else {
            pdf.save(teamName + ".pdf");
        }
    }
}

document.getElementById('submit').addEventListener('click', createPDF);
window.jsPDF = window.jspdf.jsPDF;
let errorChecking = document.getElementById('eswitch').checked;