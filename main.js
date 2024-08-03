import { Pokedex } from "./pokedex.js";

function getNature(nature) {
    let arr = [0,0,0,0,0,0];
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
                    arr[row+1] = '+';
                    arr[col+1] = '-';
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
    stats[0] = Math.floor(((2*baseStats[0]+ivs[0]+Math.floor(evs[0]/4))*level)/100)+level+10;
    for(let i = 1; i < 6; i++) {
        stats[i] = Math.floor(((2*baseStats[i]+ivs[i]+Math.floor(evs[i]/4))*level)/100)+5;
        if(nature[i] == '-')
            stats[i] = Math.floor(stats[i] * 0.9);
        else if(nature[i] == '+')
            stats[i] = Math.floor(stats[i] * 1.1);
    }
    return stats;
}

function parseLine(line) {
    let pairs = [];
    line = line.replace(/\((M|F)\)/, '').trim();
    let index = line.indexOf(':');
    let stats = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe']
    if(line.includes('Ability')) {
        pairs.push(['ability', line.substring(index+2)]);
    } else if(line.includes('Level')) {
        pairs.push(['level', parseInt(line.substring(index+2))]);
    } else if(line.includes('Tera')) {
        pairs.push(['tera', line.substring(index+2)]);
    } else if(line.includes('EVs')) {
        let evs = [0,0,0,0,0,0]
        let i = 0
        stats.forEach(stat => {
            let s = line.indexOf(stat);
            if(s != -1) {
                evs[i] = parseInt(line.substring(s-4, s).replace(/[/:]/, ''));
            }
            i++;
        });
        pairs.push(['evs', evs]);
    } else if(line.includes('IVs')) {
        let ivs = [31,31,31,31,31,31]
        let i = 0
        stats.forEach(stat => {
            let s = line.indexOf(stat);
            if(s != -1) {
                ivs[i] = parseInt(line.substring(s-3, s).replace(/[/:]/, ''));
            }
            i++;
        });
        pairs.push(['ivs', ivs]);
    } else if(line.includes('Nature')) {
        let temp = line.indexOf(' ');
        pairs.push(['nature', line.substring(0, temp)]);
    } else if(line[0] == '-') {
        pairs.push(['moves', line.substring(2)]);
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

function parseTeam() {
    let team = [];
    let append = true;
    let i = -1;
    let lines = document.getElementById('team').value.split('\n');
    lines.push('\n');
    try {
        lines.forEach(line => {
            line = line.trim();
            if(line == '') {
                if(i >= 0) {
                    console.log(i);
                    let name = team[i].get('name');
                    if(!name) {
                        throw new Error('No Species');
                    }
                    else {
                        console.log(getNormalName(name));
                        let entry = Pokedex[getNormalName(name)];
                        if(!entry) {
                            throw new Error('Invalid Species');
                        }
                        let tera = team[i].get('tera');
                        if(!tera) {
                            if('forceTeraType' in entry) {
                                team[i].set('tera', entry.forceTeraType);
                            }
                            else {
                                team[i].set('tera', entry.types[0]);
                            }
                        }
                        else {
                            if('forceTeraType' in entry) {
                                if(entry.forceTeraType.toLowerCase() != tera.toLowerCase()) {
                                    throw new Error('Invalid Tera Type');
                                }
                            }
                        }
                        let ability = team[i].get('ability');
                        if(!ability) {
                            team[i].set('ability', entry.abilities['0']);
                        }
                        else {
                            let valid = false;
                            for(const [key, value] of Object.entries(entry.abilities)) {
                                if(ability.toLowerCase() == value.toLowerCase()) {
                                    valid = true;
                                    break;
                                }
                            }
                            if(!valid) {
                                throw new Error('Invalid Ability');
                            }
                        }
                        let moves = team[i].get('moves').length;
                        if(moves < 1 || moves > 4) {
                            throw new Error('Invalid Number of Moves');
                        }
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
                let pairs = parseLine(line);
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
        return 'Unova'
    if(num <= 721)
        return 'Kalos'
    if(num <= 809)
        return 'Alola'
    if(num <= 898)
        return 'Galar'
    if(num <= 905)
        return 'Hisui'
    if(num <= 1025)
        return 'Paldea'
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
            let excludes = ['Overcast', 'Standard', 'Meadow', 'Shield', 'Active', 'Solo', 'Disguised', 'Vanilla Cream', 'Zero']
            let excluded = false;
            excludes.forEach(e => {
                if(baseForme == e) {
                    excluded = true;
                }
            });
            if(!excluded) {
                name += '-' + baseForme;
            }
        }
        else { // add regional forme if necessary
            if('otherFormes' in entry) {
                let regions_formes = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Hisui', 'Paldea', 'Bloodmoon']
                entry.otherFormes.forEach(forme => {
                    regions_formes.forEach(rf => {
                        if(forme.includes(rf)) {
                            name += '-' + getRegion(entry.num);
                        }
                    });
                });
            }
        }
    }
    return name;
}

function createPDF() {
    let team = parseTeam();
    if(team instanceof Error) {
        console.log(team);
    } else {
        const doc = new jsPDF({format: 'letter'});
        var hcenter = 215.9/2;
        var t1 = 12.95356;

        var playerName = document.getElementById('name').value;
        var trainerName = document.getElementById('trainer').value;
        var teamName = document.getElementById('teamNumber').value;
        var switchName = document.getElementById('switchProfile').value;
        var ageDivision = document.querySelector('input[name="ageDivision"]:checked').value;
        var birthday = document.getElementById('birthday').value;
        var playerId = document.getElementById('playerID').value;

        doc.addFileToVFS('calibri-normal.ttf', normal);
        doc.addFont('calibri-normal.ttf', 'calibri', 'normal');
        doc.addFileToVFS('calibri-bold.ttf', bold);
        doc.addFont('calibri-bold.ttf', 'calibrib', 'bold');
        doc.addFileToVFS('calibri-bolditalic.ttf', bolditalic);
        doc.addFont('calibri-bolditalic.ttf', 'calibriz', 'bolditalic');

        for(let counter = 0; counter < 2; counter++) {
            if(counter == 1) {
                doc.addPage('letter', 'p');
            }
            doc.setFontSize(7);
            doc.setFont("calibri", 'normal');
            var msg = "All Pokémon must be listed exactly as they appear in the Battle Team,";
            var s1 = 69.486197917
            var s2 = 33.591059701
            doc.text(hcenter - s2/2 - 0.69, 272, msg, 'center');

            doc.setFont("calibrib", 'bold');
            var msg = "at the level they are in the game.";
            doc.text(hcenter - (s1 + s2)/2 + s1 + 0.06, 272, msg);

            doc.setFontSize(13);
            doc.setFont("calibrib", 'bold');
            var msg = "Pokémon Video Game Team List";
            doc.text(hcenter, 12.5, msg, 'center');

            doc.setLineWidth(0.3);
            var x = 45;
            var y = 34.5;
            var mygap = 7;
            for (let i = 0; i < 4; i++) {
                doc.line(x, y+mygap*i, x+65, y+mygap*i);
            }

            doc.setFontSize(12);
            doc.setFont("calibrib", 'bold');

            var msg = "Player Name: ";
            doc.text(45, 33, msg, "right");

            doc.setFontSize(9);

            var msg = "Trainer Name in Game: ";
            doc.text(45, 40, msg, "right");

            var msg = "Battle Team Number / Name: ";
            doc.text(45, 47, msg, "right");

            var msg = "Switch Profile Name: ";
            doc.text(45, 54, msg, "right");

            var x = 155;
            var gapx = 21;
            for (let i = 0; i < 3; i++) {
                doc.rect(x + gapx * i, 30, 4, 4);
            }

            var msg = "Age Division: ";
            doc.text(140, 33, msg, "right");
            var msg = "Juniors ";
            doc.text(154, 33, msg, "right");
            var msg = "Seniors ";
            doc.text(175, 33, msg, "right");
            var msg = "Masters ";
            doc.text(196, 33, msg, "right");

            doc.setFont("calibri", 'normal');
            doc.setFontSize(13);
            doc.text(playerName, 47, 33);
            doc.text(trainerName, 47, 40);
            doc.text(teamName, 47, 47);
            doc.text(switchName, 47, 54);

            for (let i = 0; i < 6; i++) {
                doc.setLineWidth(0.6);
                var x = 10.95 + 99 * (i%2);
                var y = 59.5 + 70 * Math.floor(i/2);
                doc.rect(x, y, 95, 68);

                doc.setLineWidth(0.3);
                var startY = 12;
                var mygap = 8;
                for (let b = 0; b < 7; b++) {
                    doc.line(x, y+startY+mygap*b, x+95, y+startY+mygap*b);
                }
            }

            if (ageDivision >= 0) {
                doc.setLineWidth(1);
                var posX = 155 + 21 * ageDivision;
                doc.rect(posX, 30, 4, 4, 'f');
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

                doc.setFontSize(13);
                doc.setFont("calibrib", 'bold');
                doc.text("Pokémon", textXX + (i%2) * gapX, pokeY + (Math.floor(i/2)) * gapY, "right");
                doc.text("Tera Type", textXX + (i%2) * gapX, teraY + (Math.floor(i/2)) * gapY, "right");
                doc.text("Ability", textXX + (i%2) * gapX, abilityY + (Math.floor(i/2)) * gapY, "right");
                doc.text("Held Item", textXX + (i%2) * gapX, itemY + (Math.floor(i/2)) * gapY, "right");
                for (let j = 0; j < 4; j++) {
                    doc.text("Move " + (j+1), textXX + (i%2) * gapX, moveY + (Math.floor(i/2)) * gapY + j * moveGapY, "right");
                }

                if(team.length > i) {
                    doc.setFont("calibri", 'normal');
                    doc.text(getFormalName(team[i].get('name')), textX + (i%2) * gapX, pokeY + (Math.floor(i/2)) * gapY);
                    doc.text(team[i].get('tera'), textX + (i%2) * gapX, teraY + (Math.floor(i/2)) * gapY);
                    doc.text(team[i].get('ability'), textX + (i%2) * gapX, abilityY + (Math.floor(i/2)) * gapY);
                    doc.text(team[i].get('item'), textX + (i%2) * gapX, itemY + (Math.floor(i/2)) * gapY);
                    let moves = team[i].get('moves');
                    for (let j = 0; j < 4; j++) {
                        if(j<moves.length) {
                            doc.text(moves[j], textX + (i%2) * gapX, moveY + (Math.floor(i/2)) * gapY + j * moveGapY);
                        }
                    }
                }
            }
            if (counter == 0) {
                doc.setFontSize(13);
                doc.setFont("calibrib", 'bold');
                var msg = "1 of 2: ";
                let t2 = 40.15603164;
                doc.text(hcenter - (t1+t2)/2, 18, msg);
        
                doc.setFont("calibriz", 'bolditalic');
                var msg = "For Tournament Staff";
                doc.text(hcenter - (t1+t2)/2 + t1, 18, msg);
        
                doc.setFontSize(10);
                doc.setFont("calibriz", 'bolditalic');
                var msg = "Complete both pages of this document. Submit this page to event staff before the tournament, at the time set by the Organizer.";
                doc.text(hcenter, 24, msg, 'center');
        
                doc.setLineWidth(0.3);
                doc.setFontSize(9);
                doc.setFont("calibrib", 'bold');
                var msg = "Player ID: ";
                doc.text(140, 43, msg, "right");
                doc.line(140, 44.5, 180, 44.5);
                doc.setFontSize(13);
                doc.setFont("calibri", 'normal');
                doc.text(playerId, 142, 43);
        
                doc.setFontSize(9);
                doc.setFont("calibrib", 'bold');
                var msg = "Date of Birth: ";
                doc.text(140, 51, msg, "right");
                doc.line(140, 52.5, 180, 52.5);
                doc.setFontSize(13);
                doc.setFont("calibri", 'normal');
                doc.text(birthday, 142, 51);
        
                for (let i = 0; i < 6; i++) {
                    doc.setLineWidth(0.3);
                    var x = 6.5 + 99 * (i%2);
                    var y = 59.5 + 70 * Math.floor(i/2);
        
                    doc.line(x+80, y+12, x+80, y+68);
                    doc.setFontSize(5);
                    doc.setFont("calibrib", 'bold');
                    doc.text(x+81, y+14, "Level");
                    doc.text(x+81, y+22, "HP");
                    doc.text(x+81, y+30, "Atk");
                    doc.text(x+81, y+38, "Def");
                    doc.text(x+81, y+46, "Sp. Atk");
                    doc.text(x+81, y+54, "Sp. Def");
                    doc.text(x+81, y+62, "Speed");
                    doc.setFontSize(13);
                    doc.setFont("calibri", 'normal');
                    if(team.length > i) {
                        var stats = getStats(team[i].get('name'), team[i].get('evs'), team[i].get('ivs'), team[i].get('nature'), team[i].get('level'));
                        doc.text(team[i].get('level').toString(), (x+80+105.95)/2 + (i%2) * (gapX-1) * 0.5, statY + (Math.floor(i/2)) * gapY + (-1*statGapY), 'center');
                        for(let j = 0; j < 6; j++) {
                            doc.text(stats[j].toString(), (x+80+105.95)/2 + (i%2) * (gapX-1) * 0.5, statY + (Math.floor(i/2)) * gapY + j * statGapY, 'center');
                        }
                    }
                }
            }
            else if (counter == 1) {
                doc.setFontSize(13);
                doc.setFont("calibrib", 'bold');
                var msg = "2 of 2: ";
                let t2 = 27.908;
                doc.text(hcenter - (t1+t2)/2, 18, msg);
        
                doc.setFont("calibriz", 'bolditalic');
                var msg = "For Opponents";
                doc.text(hcenter - (t1+t2)/2 + t1, 18, msg);
        
                doc.setFontSize(10);
                doc.setFont("calibriz", 'bolditalic');
                var msg = "Do not lose this page! Keep it throughout the tournament, sharing it with your opponent each round.";
                doc.text(hcenter, 24, msg, 'center');
            } 
        }
        doc.save("OTS.pdf");
    }
}

document.getElementById('submit').addEventListener('click', createPDF);
window.jsPDF = window.jspdf.jsPDF;