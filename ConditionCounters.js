/*
 * Adds/removes conditions (with appropriate status markers) for
 * creatures, and handles counting down durations.
 *
 * Source: https://github.com/tobias/roll20-scripts/blob/main/ConditionCounters.js
 */

(function() {
  const _log = (msg) => {
    log("[ConditionCounters] " + msg);
  };

  const capitalize = (str) => {
    if(typeof str === 'string') {
        return str.replace(/^\w/, c => c.toUpperCase());
    } else {
        return '';
    }
  };

  const j = JSON.stringify;

  // specific to https://marketplace.roll20.net/browse/markerset/5809/rpg-condition-markers
  const conditions = {
    "bleed": "path-condition-bleeding",
    "blinded": "path-condition-blinded",
    "broken": "path-condition-broken",
    "confused": "path-condition-confused",
    "cowering": "path-condition-cowering",
    "dazed": "path-condition-dazed",
    "dazzled": "path-condition-dazzled",
    "dead": "path-condition-dead",
    "deafened": "path-condition-deafened",
    "disabled": "path-condition-disabled",
    "dying": "path-condition-dying",
    "energy-drained": "path-condition-energy drained",
    "entangled": "path-condition-entangled",
    "exhausted": "path-condition-exhausted",
    "fascinated": "path-condition-fascinated",
    "fatigued": "path-condition-fatigued",
    "flat-footed": "path-condition-flatfooted",
    "frightened": "path-condition-frightened",
    "grappled": "path-condition-grappled",
    "helpless": "path-condition-helpless",
    "incorporeal": "path-condition-incorporeal",
    "invisible": "path-condition-invisible",
    "nauseated": "path-condition-nauseated",
    "panicked": "path-condition-panicked",
    "paralyzed": "path-condition-paralyzed",
    "petrified": "path-condition-petrified",
    "pinned": "path-condition-pinned",
    "prone": "path-condition-prone",
    "shaken": "path-condition-shaken",
    "sickened": "path-condition-sickened",
    "stable": "path-condition-stable",
    "staggered": "path-condition-staggered",
    "stunned": "path-condition-stunned",
    "unconscious": "path-condition-unconscious",
  };

  // filled in by the ready callback
  let token_markers;

  const parseTurnOrder = (to_str) => {
    if (!to_str ||
        '' === to_str) {
      return [];
    } else {
      return JSON.parse(to_str);
    }
  };

  const getTurnOrder = () => {
    return parseTurnOrder(Campaign().get("turnorder"));
  };

  const tagForCondition = (condition_name) => {
    const token_name = conditions[condition_name];
    if (token_name) {
      const token = _.find(token_markers, (tm) => tm.name === token_name);
      if (token) {
        return token.tag;
      } else {
        _log(`token for ${name} not found`);
      }
    } else {
      _log(`name for condition ${condition_name} not found`);
    }

    return undefined;
  };

  const getNotifiableName = (id) => {
    let person = getObj("player", id);
    if (!person) {
      person = getObj("character", id);
    }
    if (person) {
      return person.get("_displayname") || person.get("name");
    } else {
      return undefined;
    }
  };

  const whisper = (to, msg) => {
    let name;

    if ("gm" === to ||
        playerIsGM(to)) {
      name = "gm";
    } else {
      name = getNotifiableName(to);
    }
    _log(`whispering ${name} ${msg}`);
    if (name) {
      sendChat("ConditionCounters", `/w ${name} ${msg}`);
    }
  };

  const hasToken = (obj, tag) => {
    let current_markers = obj.get("statusmarkers").split(',');
    return current_markers.includes(tag);
  };

  const addToken = (obj, tag) => {
    _log(`adding ${tag} to ${obj.id}`);
    if (!hasToken(obj, tag)) {
      let current_markers = obj.get("statusmarkers").split(',');
      current_markers.push(tag);
      obj.set("statusmarkers", current_markers.join(','));
    } else {
      _log(`${tag} already present on ${obj.id}`);
    }
  };

  const removeTokens = (obj, tags) => {
    _log(`removing ${tags}`);
    let current_markers = obj.get("statusmarkers").split(',');
    obj.set("statusmarkers", _.without(current_markers, ...tags).join(','));
  };


  const initState = () => {
    if (!state.ConditionCounters) {
      state.ConditionCounters = {
        version: "0.1",
        conditions: []
      };
    }
  };

  const clearState = () => {
    state.ConditionCounters = undefined;
    initState();
    _log("state cleared");
  };

  const removeStateCondition = (id, condition) => {
    let conditions = _.reject(state.ConditionCounters.conditions,
                              (data) => {
                                if(data.target === id &&
                                   data.condition === condition) {
                                  _log(`removing ${id}:${condition} from state`);
                                  return true;
                                } else {
                                  return false;
                                }
                              });
    state.ConditionCounters.conditions = conditions;

    return conditions;
  };

  const setStateCondition = (data) => {
    let conditions = removeStateCondition(data.target, data.condition);
    conditions.unshift(data);
    state.ConditionCounters.conditions = conditions;
    _log(`${data.target}:${data.condition} set in state`);
  };

  const getStateCondition = (id, condition) => {
    return _.find(state.ConditionCounters.conditions,
                  (data) => {
                    return data.target === id &&
                      data.condition === condition;
                  });
  };

  const badNews = [
    "Oops!",
    "Ruh roh!",
    "Darn!",
    "Crikey!",
    "Bad news.",
    "Well... crap.",
    "I've got bad news and bad news.",
    "Do not taunt happy fun ball.",
  ];

  const goodNews = [
    "Yay!",
    "Awesome!",
    "Guess what?",
    "Lucky you!",
    "You're on lucky street today!",
  ];

  const randNews = (list) => () => list[randomInteger(list.length - 1)];

  const randBadNews = randNews(badNews);

  const randGoodNews = randNews(goodNews);

  const hl = (str) => {
    return `<strong>${capitalize(str)}</strong>`;
  };

  const fmtcond = (name) => {
    if (PF1Conditions) {
      return `[${capitalize(name)}](!cond ${name})`;
    } else {
      return `<strong>${capitalize(name)}</strong>`;
    }
  }

  const notifyConditionAdded = (to, target, condition, duration) => {
    if (target) {
      const character = getObj("character", target);
      const character_name = character.get("name");
      if (character) {
        if ("gm" === to) {
          whisper("gm", `Added ${fmtcond(condition)} to ${hl(character_name)}` +
                  (duration ? ` (duration: ${duration})` : ""));
        } else {
          whisper(target, `${randBadNews()} You now have the ${fmtcond(condition)} condition`);
        }
      }
    }
  };

  const notifyConditionRemoved = (to, target, condition) => {
    if (target) {
      const character = getObj("character", target);
      const character_name = character.get("name");
      if (character) {
        if ("gm" === to) {
          whisper("gm", `Removed ${fmtcond(condition)} from ${hl(character_name)}`);
        } else {
          whisper(target, `${randGoodNews()} You no longer have the ${fmtcond(condition)} condition`);
        }
      }
    }
  };

  const characterHasController = (id) => {
    const character = getObj("character", id);
    if (character) {
      const controlledby = character.get("controlledby");
      return "" !== controlledby;
    } else {
      return false;
    }
  };

  const addCondition = (obj, requestor, condition_name, duration) => {
    const tag = tagForCondition(condition_name);
    const represents = obj.get("represents");

    if (tag) {
      addToken(obj, tag);
      if (duration) {
        const current_actor = getTurnOrder()[0];
        if (current_actor) {
          const actor_id = current_actor.id;
          setStateCondition({
            actor: actor_id,
            target: obj.id,
            updated_on_round: AddRoundCounter.getRoundCount(),
            condition: condition_name,
            duration: duration
          });
        }
      }
      if (characterHasController(represents)) {
        notifyConditionAdded(represents, represents, condition_name, duration);
      }
      notifyConditionAdded("gm", represents, condition_name, duration);
    } else {
      whisper(requestor, `Unknown condition ${condition_name}`);
    }
  };

  const removeCondition = (obj, requestor, condition_name) => {
    const tag = tagForCondition(condition_name);
    const represents = obj.get("represents");
    if (tag) {
      if(hasToken(obj, tag)) {
        removeStateCondition(obj.id, condition_name);
        removeTokens(obj, [tag]);
        if (characterHasController(represents)) {
          notifyConditionRemoved(represents, represents, condition_name);
        }
        notifyConditionRemoved("gm", represents, condition_name);
      }
    } else {
      whisper(requestor, `Unknown condition ${condition_name}`);
    }
  };

  const showConditions = (_obj, requestor) => {
    const turnorder = getTurnOrder();
    const active_ids = _.map(turnorder, (turn) => turn.id);
    const conditions = _.filter(state.ConditionCounters.conditions,
                                (cond) => active_ids.includes(cond.target));
    const active_conditions = _.reduce(conditions,
                                       (acc, cond) => {
                                         if (!acc[cond.target]) {
                                           acc[cond.target] = [];
                                         }
                                         acc[cond.target].push(cond);
                                         return acc;
                                       },
                                       {});
    let msg = "<ul>";
    _.each(_.pairs(active_conditions),
           (pair) => {
             const [id, conditions] = pair;
             const obj = getObj("graphic", id);
             const name = getNotifiableName(obj.get("represents"));
             if (name) {
               msg += `<li>${name}:<ul>`;
               _.each(conditions, (cond) => {
                 msg += `<li>${fmtcond(cond.condition)} (duration: ${cond.duration})</li>`;
               });
               msg += "</ul></li>";
             }
           });
    msg += "</ul>";
    whisper(requestor, msg);
  };

  const clearConditions = (obj, requestor) => {
    _.each(_.keys(conditions),
           (condition) => removeCondition(obj, requestor, condition));
  };

  const findConditionsForActor = (id) => {
    return _.filter(state.ConditionCounters.conditions,
                    (data) => id === data.actor);
  };

  const findConditionsForTarget = (id) => {
    return _.filter(state.ConditionCounters.conditions,
                    (data) => id === data.target);
  };

  const countDownCondition = (cond) => {
    const round_count = AddRoundCounter.getRoundCount();
    if (round_count > cond.updated_on_round) {
      cond.duration -= 1;
      cond.uodated_on_round = round_count;
      if (cond.duration === 0) {
        removeCondition(getObj("graphic", cond.target), undefined, cond.condition);
      } else {
        setStateCondition(cond);
      }
    }
  };

  const handleTurnOrderChange = (obj, prev) => {
    const turnorder = getTurnOrder();
    const prev_turnorder = parseTurnOrder(prev.turnorder);
    const actor = turnorder[0].id;
    const prev_actor = prev_turnorder[0].id;
    if (actor === prev_actor ||
        turnorder.length != prev_turnorder.length) {
      // the current actor probably hasn't changed, we're adding/removing/sorting
      _log("init change w/o new actor");
    } else {
      _log(`handling turnorder change for actor ${actor}`);

      // update all conditions where the actor is actor
      _.each(findConditionsForActor(actor), countDownCondition);

      // get all conditions where the target is actor. If actor for
      // that cond is not in the turn order, update
      _.each(findConditionsForTarget(actor), (cond) => {
        if (!_.find(turnorder, (turn) => turn.id === cond.actor)) {
          countDownCondition(cond);
        }
      });
    }
  };

  const handleChatMessage = (msg) => {
    const [cmd, subcmd, ...args] = msg.content.split(" ");
    let f = undefined;
    if (cmd === "!cc") {
      if (playerIsGM(msg.playerid)) {
        switch (subcmd) {
        case "add":
          f = addCondition;
          break;
        case "clear":
          f = clearConditions;
          break;
        case "remove":
          f = removeCondition;
          break;
        case "show":
          f = showConditions;
          break;
        default:
          whisper(msg.playerid, `invalid command: !cc ${subcmd}`);
          _log("Invalid command: " + subcmd);
        }

        if (f) {
          _.each(msg.selected, (selected) => {
            const graphic = getObj("graphic", selected._id);
            if (graphic) {
              f(graphic, msg.playerid, ...args);
            }
          });
        }
      } else {
        whisper(msg.playerid, "!cc can only be used by the GM");
        _log("non-GM tried to use !cc");
      }
    }
  };

  on("chat:message", handleChatMessage);

  on("change:campaign:turnorder", handleTurnOrderChange);

  on("ready", () => {
    initState();
    token_markers = JSON.parse(Campaign().get("token_markers"));
    // AddRoundCounter must be loaded since this uses it to track the
    // round count
    if (AddRoundCounter) {
      _log("loaded");
    } else {
      _log("ERROR: AddRoundCounter not found!");
    }
  });

})();

