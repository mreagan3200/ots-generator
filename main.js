import { Pokedex } from "./pokedex.js";
import { Learnsets } from "./learnsets.js";

//TODO: Add Help Page: Include where to find information for teamsheet and information on Showdown Export Format
//TODO: Change Behemoth Blade/Bash into Iron Head
//TODO: fix 'flabebe', 'floette', 'florges', 'furfrou'
//TODO: squawkabilly colors
//TODO: Silvally/Arceus Types

//TODO: add support for Support ID

let pseudoCosmeticFormes = ['Two-Segment', 'Three-Segment', 'Three', 'Four', 'Fancy', 'Pokeball', 'Original', 'Chest', 'Roaming', 
    'Counterfeit', 'Artisan', 'Unremarkable', 'Masterpiece', 'Phony', 'Antique', 'Amped', 'Low-Key', 'Active', 'Neutral', 'Dada', 
    'Douse', 'Shock', 'Burn', 'Chill', 'Ordinary', 'Resolute', 'Bond', 'Totem', 'Gmax', 'Eternamax',];

function getNature(nature) {
    let arr = [1,1,1,1,1,1];
    let natures = [
        ['Serious', 'Lonely', 'Adamant', 'Naughty', 'Brave'],
        ['Bold', 'Hardy', 'Impish', 'Lax', 'Relaxed'],
        ['Modest', 'Mild', 'Docile', 'Rash', 'Quiet'],
        ['Calm', 'Gentle', 'Careful', 'Bashful', 'Sassy'],
        ['Timid', 'Hasty', 'Jolly', 'Naive', 'Quirky']];
    for(let row = 0; row < 5; row++) {
        for(let col = 0; col < 5; col++) {
            if(natures[row][col].toLowerCase() == nature.toLowerCase()) {
                if(row != col) {
                    arr[row+1] = 1.1;
                    arr[col+1] = 0.9;
                    return arr;
                }
                else return arr;
            }
        }
    }
    throw new Error('Invalid Stat Alignment [' + nature + ']');
}

function getStats(name, evs, nature, level) {
    try {
        name = name.toLowerCase().replace(/[ -]/, '').trim();
        let bs = Pokedex[normalize(name)].baseStats;
        let baseStats = [bs['hp'], bs['atk'], bs['def'], bs['spa'], bs['spd'], bs['spe']];
        let stats = [0,0,0,0,0,0];
        nature = getNature(nature);
        if(baseStats[0] == 1)
            stats[0] = 1;
        else
            stats[0] = baseStats[0] + evs[0] + 75;
        for(let i = 1; i < 6; i++) {
            stats[i] = Math.floor((baseStats[i] + evs[i] + 20)*nature[i]);
        }
        return stats;
    }
    catch(e) {
        return e;
    }
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
                if(num > 32 || num < 0)
                    if(errorChecking)
                        throw new Error('Invalid EV Value (Slot ' + (teamIndex+1).toString() + ') [' + (num).toString() + ' ' + stat + ']');
                total += num;
                evs[i] = num;
            }
            i++;
        });
        if(total > 66)
            if(errorChecking)
                throw new Error('Invalid EV Total (Slot ' + (teamIndex+1).toString() + ') [' + (total).toString() + ']');
        pairs.push(['evs', evs]);
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
    // return entry.some(gen => gen.charAt(0) === '9');
    return true;
}

function checkValidMoves(slot, name, pokemonEntry, learnset, moves, movesLen) {
    for(let m = 0; m < movesLen; m++) {
        let e = pokemonEntry;
        let l = learnset;
        let moveEntry = normalize(moves[m])
        let validMove = false;
        if(!l) {
            let baseSpecies = e['baseSpecies'];
            if(!baseSpecies)
                throw new Error('Can\'t find learnset for ' + getFormalName(name) + ' (Slot ' + (slot+1).toString() + ')')
            l = Learnsets[normalize(baseSpecies)]['learnset'];
            if(!l)
                throw new Error('Can\'t find learnset for ' + getFormalName(name) + ' (Slot ' + (slot+1).toString() + ')')
        }
        let prevo;
        do {
            let validGensArr = l[moveEntry];
            if(moveEntry in l) {
                validMove = checkValidMove(validGensArr);
            }
            if(!validMove && 'sketch' in l) {
                //Moves that Smeargle cannot sketch:
                let unsketchable = ['wickedtorque', 'blazingtorque', 'noxioustorque', 'magicaltorque', 'combattorque', 'revivalblessing', 'terastarstorm', 'darkvoid', 'hyperspacefury'];
                if(unsketchable.indexOf(moveEntry) == -1){
                    validMove = true;
                }
            }
            prevo = e['prevo'];
            if(prevo) {
                e = Pokedex[normalize(prevo)];
                l = Learnsets[normalize(prevo)]['learnset'];
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
        let itemsSet = new Set();
        let prevLine = 'start';
        lines.forEach(line => {
            line = line.trim();
            if(line == '' && prevLine != '') {
                if(i >= 0) {
                    let name = team[i].get('name');
                    let ability = team[i].get('ability');
                    let item = team[i].get('item');
                    let tera = team[i].get('tera');
                    let moves = team[i].get('moves')
                    let movesLen = moves.length;
                    if(!name) {
                        if(errorChecking)
                            throw new Error('No Species (Slot ' + (i+1).toString() + ')');
                    }
                    let entryP = Pokedex[normalize(name)];
                    if(!entryP) {
                        if(errorChecking)
                            throw new Error('Invalid Species (Slot ' + (i+1).toString() + ')');
                    }
                    // Required Item(s), Ability, Move, Tera Type
                    if('requiredItem' in entryP || 'requiredItems' in entryP) {
                        if('requiredItem' in entryP) {
                            if(item == 'No Item') {
                                item = entryP.requiredItem;
                            }
                            if(errorChecking && item != entryP.requiredItem)
                                throw new Error('Invalid Item (Slot ' + (i+1).toString() + ')');
                        }
                        else if('requiredItems' in entryP) {
                            if(item == 'No Item') {
                                item = entryP.requiredItems[0]
                            }
                            if(errorChecking) {
                                let valid = false;
                                entryP.requiredItems.forEach(reqItem => {
                                    if(item == reqItem){
                                        valid = true;
                                    }
                                });
                                if(!valid) {
                                    throw new Error('Invalid Item (Slot ' + (i+1).toString() + ')');
                                }
                            }   
                        }
                    }
                    if(itemsSet.has(item)) { //Item Clause
                        throw new Error('Duplicate Item (Slot ' + (i+1).toString() + ')');
                    }
                    else if(item != 'No Item') {
                        itemsSet.add(item);
                    }

                    let isAbilityRequired = false;
                    if('requiredAbility' in entryP) {
                        isAbilityRequired = true;
                        if(!ability) {
                            ability = entryP.abilities['0'];
                            let peren = ability.indexOf('(');
                            if(peren > 0){
                                ability = ability.substring(0, peren).trim();
                            }
                        }
                        if(errorChecking && ability != entryP.requiredAbility)
                            throw new Error('Invalid Ability (Slot ' + (i+1).toString() + ')');
                    }
                    let isMegaOrPrimal = false;
                    if('forme' in entryP) {
                        let forme = entryP.forme;
                        if(forme == 'Mega' || forme == 'Primal') {
                            isMegaOrPrimal = true;
                            ability = undefined;
                        }
                    }

                    if(movesLen < 1 || movesLen > 4) {
                        if(errorChecking)
                            throw new Error('Invalid Number of Moves (Slot ' + (i+1).toString() + ')');
                    }
                    if('requiredMove' in entryP) {
                        let hasRequiredMove = false;
                        moves.forEach(move => {
                            if(move == entryP.requiredMove)
                                hasRequiredMove = true;
                        });
                        if(errorChecking && !hasRequiredMove)
                            throw new Error('Missing Required Move: ' + entryP.requiredMove + ' (Slot ' + (i+1).toString() + ')');
                    }

                    if('battleOnly' in entryP) {
                        name = entryP.battleOnly;
                        if(Array.isArray(name))
                            name = name[0];
                        entryP = Pokedex[normalize(name)];
                    }
                    else if('baseSpecies' in entryP) {
                        if(entryP.forme.includes('Mega') || entryP.forme.includes('Primal') || (entryP.isCosmeticForme) || (entryP.forme && pseudoCosmeticFormes.includes(entryP.forme))) {
                            name = entryP.baseSpecies;
                            entryP = Pokedex[normalize(name)];
                        }   
                    }
                    if(!entryP) {
                        if(errorChecking)
                            throw new Error('Invalid Species (Slot ' + (i+1).toString() + ')');
                    }

                    if(!tera) {
                        tera = 'requiredTeraType' in entryP ? entryP.requiredTeraType : entryP.types[0];
                    }
                    else {
                        if('requiredTeraType' in entryP) {
                            if(entryP.requiredTeraType.toLowerCase() != tera.toLowerCase()) {
                                if(errorChecking)
                                    throw new Error('Invalid Tera Type (Slot ' + (i+1).toString() + ')');
                            }
                        }
                    }

                    // let entryL = Learnsets[normalize(name)]; //move this to checkValidMoves function and change logic
                    // if(errorChecking) {
                    //     checkValidMoves(i, name, entryP, entryL['learnset'], moves, movesLen);
                    // }
                    if(!isAbilityRequired) {
                        if(!ability) {
                            ability = entryP.abilities['0'];
                            let peren = ability.indexOf('(');
                            if(peren > 0){
                                ability = ability.substring(0, peren).trim();
                            }
                        }
                        let valid = false;
                        for(const [key, value] of Object.entries(entryP.abilities)) {
                            let v = value;
                            if(v.includes('(')) {
                                v = v.substring(0,value.indexOf('(')).trim();
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

                    team[i].set('tera', tera);
                    team[i].set('item', item);
                    team[i].set('name', name);
                    team[i].set('ability', ability);
                }
                append = true;
            } else {
                if(append) {
                    i++;
                    team.push(new Map());
                    team[i].set('moves', []);
                    team[i].set('level', 50);
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
            prevLine = line;
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
//lowercase no spaces/dashes
function normalize(name) {
    return name.toLowerCase().normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').replaceAll(/[ \.\'%-]/g, '').trim();
}

function getFormalName(name) {
    let normalized = normalize(name);
    let entryP = Pokedex[normalized];

    let baseSpecies = ('baseSpecies' in entryP) ? entryP.baseSpecies : entryP.name;
    let forme = '';
    let excluded = false; //exclude if formes have battleOnly or isCosmeticForme
    let hasPseudoCosmeticForme = false;

    if('baseSpecies' in entryP) {
        if(entryP.forme.includes('Mega'))
            baseSpecies = entryP.baseSpecies;
        if(entryP.isCosmeticForme)
            baseSpecies = entryP.baseSpecies;
        if(pseudoCosmeticFormes.includes(entryP.forme)) {
            hasPseudoCosmeticForme = true;
            baseSpecies = entryP.baseSpecies;
        }
        else if(entryP.forme.includes('Totem')) {
            hasPseudoCosmeticForme = true;
            baseSpecies = entryP.baseSpecies;
        }
    }
    if('baseForme' in entryP) { // add baseForme if necessary
        //otherFormes/cosmeticFormes
        if('cosmeticFormes' in entryP) { // Contains cosmetic formes: do not add base forme
            excluded = true;
        }
        else if(pseudoCosmeticFormes.includes(entryP.baseForme)) {
            excluded = true;
            hasPseudoCosmeticForme = true;
        }
        else if('otherFormes' in entryP) { // Contains other formes: need to check if other formes contain battleOnly tag
            entryP.otherFormes.forEach(otherF => {
                let entryOtherF = Pokedex[normalize(otherF)]
                if('battleOnly' in entryOtherF && !entryOtherF.forme.includes('Mega')) {
                    excluded = true;
                }
            });
        }
    }
    if('otherFormes' in entryP) { // add regional forme if necessary
        let regions_formes = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Hisui', 'Paldea', 'Bloodmoon'];
        let done = false;
        entryP.otherFormes.forEach(otherF => {
            regions_formes.forEach(rf => {
                if(otherF.includes(rf) && !done) {
                    forme = getRegion(entryP.num);
                    done = true;
                }
            });
        });
    }
    if(!forme) {
        if('forme' in entryP)
            forme = entryP.forme;
        else if ('baseForme' in entryP) {
            forme = entryP.baseForme;
        }
    }
    // console.log('Base Species: ' + baseSpecies + ', Forme: ' + forme + ', Excluded: ' + excluded + ', PCF: ' + hasPseudoCosmeticForme);
    if(excluded) {
        return baseSpecies;
    }
    else {
        if(hasPseudoCosmeticForme) {
            pseudoCosmeticFormes.forEach(cForme => {
                forme = forme.replaceAll(cForme, '');
            });
        }
        forme = forme.replaceAll('-', ' ')
        return baseSpecies + ' ' + forme;
    }
}

function createPDF() {
    // testAllDisplayNames();
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
        var supportId = document.getElementById('supportID').value;

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
            pdf.setFontSize(8);
            pdf.setFont("calibri", 'normal');
            var msg = "All Pokémon must be listed exactly as they appear in the Battle Team.";
            pdf.text(hcenter, 272, msg, 'center');

            pdf.setFontSize(13);
            pdf.setFont("calibrib", 'bold');
            var msg = "Pokémon Video Game Team List";
            pdf.text(hcenter, 12.5, msg, 'center');

            pdf.setLineWidth(0.3);
            var x = 45;
            var y = 34.5;
            var mygap = 7;
            for (let i = 0; i < 4; i++) {
                pdf.line(x, y+mygap*i, x+60, y+mygap*i);
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

                pdf.setFontSize(9);
                pdf.setFont("calibrib", 'bold');
                pdf.text("Stat Alignment", textXX + (i%2) * gapX, teraY + (Math.floor(i/2)) * gapY, "right");

                pdf.setFontSize(13);
                pdf.text("Pokémon", textXX + (i%2) * gapX, pokeY + (Math.floor(i/2)) * gapY, "right");
                pdf.text("Ability", textXX + (i%2) * gapX, abilityY + (Math.floor(i/2)) * gapY, "right");
                pdf.text("Held Item", textXX + (i%2) * gapX, itemY + (Math.floor(i/2)) * gapY, "right");
                for (let j = 0; j < 4; j++) {
                    pdf.text("Move " + (j+1), textXX + (i%2) * gapX, moveY + (Math.floor(i/2)) * gapY + j * moveGapY, "right");
                }

                if(team.length > i) {
                    pdf.setFont("calibri", 'normal');
                    pdf.text(getFormalName(team[i].get('name')), textX + (i%2) * gapX, pokeY + (Math.floor(i/2)) * gapY);
                    pdf.text(team[i].get('nature'), textX + (i%2) * gapX, teraY + (Math.floor(i/2)) * gapY);
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
                pdf.text(140, 40, msg, "right");
                pdf.line(140, 41.5, 200, 41.5);

                var msg = "Date of Birth: ";
                pdf.text(140, 47, msg, "right");
                pdf.line(140, 48.5, 200, 48.5);

                var msg = "Support ID: ";
                pdf.text(140, 54, msg, "right");
                pdf.line(140, 55.5, 200, 55.5);


                pdf.setFontSize(13);
                pdf.setFont("calibri", 'normal');
                pdf.text(playerId, 142, 40);
                
                pdf.text(birthday, 142, 47);

                pdf.text(supportId, 142, 54);
        
                for (let i = 0; i < 6; i++) {
                    pdf.setLineWidth(0.3);
                    var x = 6.5 + 99 * (i%2);
                    var y = 59.5 + 70 * Math.floor(i/2);
                    
                    pdf.line(x+80, y+20, x+80, y+68);
                    pdf.setFontSize(5);
                    pdf.setFont("calibrib", 'bold');
                    pdf.text(x+81, y+22, "HP");
                    pdf.text(x+81, y+30, "Atk");
                    pdf.text(x+81, y+38, "Def");
                    pdf.text(x+81, y+46, "Sp. Atk");
                    pdf.text(x+81, y+54, "Sp. Def");
                    pdf.text(x+81, y+62, "Speed");
                    pdf.setFontSize(13);
                    pdf.setFont("calibri", 'normal');
                    if(team.length > i) {
                        var stats = getStats(team[i].get('name'), team[i].get('evs'), team[i].get('nature'), team[i].get('level'));
                        if(stats instanceof Error) {
                            document.getElementById('error').innerText = stats.toString();
                        }
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

function testAllDisplayNames() {
    for (const [key, value] of Object.entries(Pokedex)) {
        if(value.num > 0) {
            let entryP = value;
            let name = key;
            if('battleOnly' in entryP) {
                name = entryP.battleOnly;
                if(Array.isArray(name))
                    name = name[0];
                entryP = Pokedex[normalize(name)];
            }
            else if('baseSpecies' in entryP) {
                if(entryP.forme.includes('Mega') || entryP.forme.includes('Primal') || (entryP.isCosmeticForme) || (entryP.forme && pseudoCosmeticFormes.includes(entryP.forme))) {
                    name = entryP.baseSpecies;
                    entryP = Pokedex[normalize(name)];
                }   
            }
            console.log(`${key}: ${getFormalName(name)}`);
        }
    }
}

document.getElementById('submit').addEventListener('click', createPDF);
window.jsPDF = window.jspdf.jsPDF;
let errorChecking = document.getElementById('eswitch').checked;