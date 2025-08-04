
var PAS_MODEL = `
<!-- Choose Files Modal -->
<div class="modal fade" id="chooseFilesPASModel" tabindex="-1" role="dialog" aria-labelledby="chooseFilesModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
        <h4 class="modal-title" style="display:inline" id="chooseFilesModalLabel">Compute plan</h4>
      </div>
      <div class="modal-body">
        <form class="form-horizontal" role="form">
          <div class="form-group">
            <label for="domainPASSelection" class="col-sm-4 control-label">Domain</label>
            <div class="col-sm-5">
              <select id="domainPASSelection" class="form-control file-selection">
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="problemPASSelection" class="col-sm-4 control-label">Problem</label>
            <div class="col-sm-5">
              <select id="problemPASSelection" class="form-control file-selection">
              </select>
            </div>
          </div>
          <div class="form-group hidden" id="planPASSelectionGroup">
            <label for="planPASSelection" class="col-sm-4 control-label">Plan</label>
            <div class="col-sm-5">
              <select id="planPASSelection" class="form-control file-selection">
              </select>
            </div>
          </div>
          <div class="form-group">
          <label for="solverPASSelection" class="col-sm-4 control-label">Solver</label>
          <div class="col-sm-5">
            <select id="solverPASSelection" class="form-control file-selection">
            </select>
          </div>
          </div>

          <div id="parametersPAS">
          </div>
        </form>
        </div>
      <div class="modal-footer" >

      <div class="btn-toolbar">
        <button id="filesChosenButton" class="btn-lg btn-success" type="button" onclick="filesChosen()">Plan</button>
        <button type="button" class="btn btn-default"  data-dismiss="modal">Cancel</button>
        </div>
      </div>

  </div>
</div>
`

var SOLVER_STYLE = "\
.plan-list, .plan-display-action {\
    display: inline-block;\
}\
\
.plan-display-action {\
    margin-left: 26px;\
    padding-right: 52px;\
}\
\
.plan-display {\
    margin-left: 26px;\
    margin-top: 13px;\
}\
";

var SOLVER_OUTPUT_MODAL = "\
<div class=\"modal fade\" id=\"planOutputModal\" tabindex=\"-1\" role=\"dialog\" aria-labelledby=\"planOutputModalLabel\" aria-hidden=\"true\">\
  <div class=\"modal-dialog modal-lg\">\
    <div class=\"modal-content\">\
      <div class=\"modal-header\">\
        <button type=\"button\" class=\"close\" data-dismiss=\"modal\"><span aria-hidden=\"true\">&times;</span><span class=\"sr-only\">Close</span></button>\
        <h4 class=\"modal-title\" id=\"planOutputModalLabel\">Solver Output</h4>\
      </div>\
      <div class=\"modal-body\">\
      <pre id=\"solver-raw-output\" style=\"max-height:550px\">\
      </pre>\
      </div>\
      <div class=\"modal-footer\">\
        <button type=\"button\" class=\"btn btn-default\" data-dismiss=\"modal\">Close</button>\
      </div>\
    </div>\
  </div>\
</div>\
";

function showPlan(res) {

    var tab_name;
    if (res['status'] === 'ok')
        tab_name = 'Plan (' + (Object.keys(window.plans).length + 1) + ')';
    else
        tab_name = 'Error (' + (Object.keys(window.plans).length + 1) + ')';

    window.new_tab(tab_name, function (editor_name) {
        var plan_html = '';
        window.plans[editor_name] = res.result;

        if (res['status'] === 'ok') {

            var cost_txt = '';
            if (res.cost)
                cost_txt = ' Cost: ' + res.cost;

            plan_html += '<div class=\"plan-display\">';
            plan_html += '<h2>Found Plan (<a href=\"#\" onclick=\"showSolverOutput(\'' + editor_name + '\')\">output</a>)' + cost_txt + '</h2>';

            plan_html += '<div class=\"list-group plan-list left\">';
            for (var i = 0; i < res.result.plan.length; i++) {
                var act_name = '';
                if (res.result.type === 'simple')
                    act_name = res.result.plan[i];
                else
                    act_name = res.result.plan[i].name;
                plan_html += '<a href=\"#\" onclick=\"showAction(\'' + editor_name + '\', ' + i + ')\" class=\"list-group-item\">' + act_name + '</a>';
            }
            plan_html += '</div>';

            if (res.result.type === 'full') {
                plan_html += '<pre class=\"plan-display-action well\">';
                plan_html += '</pre>';
            }

            plan_html += '</div>';

        } else {

            plan_html += '<div class=\"plan-display\">\n';

            plan_html += '<pre class=\"plan-display-action well\">\n';
            if (res['result']['parse_status'] === 'err')
                plan_html += res['result']['error'];
            else
                plan_html += JSON.stringify(res['result'], null, 2);
            plan_html += '</pre>';
        }

        $('#' + editor_name).html(plan_html);

        if (res['status'] === 'ok')
            showAction(editor_name, 0);
    });

}

function showSolverOutput(editor) {
    $('#solver-raw-output').html(window.plans[editor].output);
    $('#planOutputModal').modal('toggle');
}

function showAction(editor, action) {
    $('#' + editor + ' .plan-list a').removeClass('active');
    $('#' + editor + ' .plan-list a').eq(action).addClass('active');
    if (window.plans[editor].type === 'full') {
        var action_text = window.plans[editor].plan[action].action.replace(/\n/g, '<br />');
        $('#' + editor + ' .plan-display-action').html(action_text);
    }
}


function getAllPlanner() {

    // Clear things out first
    $('#solverPASSelection').empty();
    $('#solverPASSelection').off('change');

    $.ajax({
        url: window.PASURL + "/package",
        type: "GET",
        contentType: 'application/json'
    })
        .done(function (res) {
            var option = ""
            window.PAS_PACKAGES = Object.values(res);
            //sort by name, as this is the option shown in the solver list
            window.PAS_PACKAGES = window.PAS_PACKAGES.sort((a, b) => {
                if (a.name < b.name) {
                    return -1;
                }
            });
            for (const package of window.PAS_PACKAGES) {
                option += "<option value=\"" + package["package_name"] + "\">" + package["name"] + "</option>\n";

            }
            $('#solverPASSelection').append(option);
            var activePackageName = $('#solverPASSelection').find(':selected').val();
            for (const package of window.PAS_PACKAGES) {
                if (package["package_name"] == activePackageName) {
                    var args = package["endpoint"]["services"]["solve"]["args"]
                    window.paramatersPAS = args
                }
            }

            $('#solverPASSelection').on('change', function (e) {
                $('#planPASSelectionGroup').addClass('hidden');
                var packageName = this.value;
                for (const package of window.PAS_PACKAGES) {
                    if (package["package_name"] == packageName) {
                        var args = [];
                        if (package["endpoint"]["services"].hasOwnProperty("validate")) {
                            args = package["endpoint"]["services"]["validate"]["args"];
                            $('#planPASSelectionGroup').removeClass('hidden');
                        } else {
                            args = package["endpoint"]["services"]["solve"]["args"];
                        }
                        window.paramatersPAS = args;
                        var newElement = "";


                        // Display Description
                        newElement += ' <div class="form-group">';
                        newElement += '<label for="solverPASSelectionDes" class="col-sm-4 control-label">Description</label>';
                        newElement += '<div class="col-sm-5 form-control-static">';
                        newElement += '<small id="solverPASSelectionDes" class="form-text text-muted">' + package["description"] + '</small>'
                        newElement += '</div> </div>';

                        for (const parameter of args) {

                            if (parameter["name"] != "domain" && parameter["name"] != "problem" && parameter["name"] != "plan") {

                                if (parameter["type"] == "categorical") {

                                    newElement += ' <div class="form-group">';
                                    newElement += '<label for="' + parameter["name"] + 'PAS" class="col-sm-4 control-label">' + parameter["name"] + '</label>';
                                    newElement += '<div class="col-sm-5">';
                                    newElement += '<select id="' + parameter["name"] + 'PAS" class="form-control file-selection">';

                                    for (const item of parameter["choices"]) {
                                        var option;
                                        if (item["value"] == parameter["default"]) {
                                            option = "<option value=\"" + item["value"] + "\" selected>" + item["display_value"] + "</option>\n";
                                        } else {
                                            option = "<option value=\"" + item["value"] + "\">" + item["display_value"] + "</option>\n";
                                        }
                                        newElement += option
                                    }
                                    newElement += '</select>';

                                    newElement += '</div> </div>';

                                } else {

                                    newElement += ' <div class="form-group">';
                                    newElement += '<label for="' + parameter["name"] + 'PAS" class="col-sm-4 control-label">' + parameter["name"] + '</label>';
                                    newElement += '<div class="col-sm-5">';
                                    if (parameter["default"]) {
                                        newElement += '<input type="text" class="form-control" id="' + parameter["name"] + 'PAS" value="' + parameter["default"] + '">';
                                    } else {
                                        newElement += '<input type="text" class="form-control" id="' + parameter["name"] + 'PAS">';
                                    }
                                    newElement += '<small id="' + parameter["name"] + 'HelpBlock" class="form-text text-muted">';
                                    newElement += "Type: " + parameter["type"];
                                    newElement += '</small>';
                                    newElement += '</div> </div>';

                                }

                            }
                        }
                        $('#parametersPAS').html(newElement);

                    }
                }
            });
            $('#solverPASSelection').trigger("change");


        }).fail(function (res) {
            window.toastr.error('Error: Could not get the package list');
        });
}



function getPlan(taskID, retryNum) {

    setTimeout(function () {   //  call a 3s setTimeout when the loop is called
        $.ajax({
            url: window.PASURL + taskID,
            type: "POST",
            contentType: 'application/json',
            data: JSON.stringify({ "adaptor": "planning_editor_adaptor" })
        })
            .done(function (res) {

                console.log("Response from PaaS:");
                console.log(res);

                if (res['status'] === 'ok') {
                    window.toastr.success('Plan is ready');
                    for (plan of res["plans"]) {
                        showPlan(plan)
                    }
                } else if (res['status'] === 'error') {
                    window.toastr.error('Planning failed.');
                    showPlan(res)
                }
                else {

                    if (retryNum < 20) {
                        getPlan(taskID, retryNum + 1);
                        if (retryNum % 5 == 0) {
                            window.toastr.info('Solving in progress');
                        }
                    } else {
                        window.toastr.error('Timeout');

                    }

                }

            }).fail(function (res) {
                window.toastr.error('Error: Malformed URL? ' + window.PASURL + taskID);
            });
    }, 1000)
}


// function to run animation of resultant output in iframe
function runPAS() {
    var domText = window.ace.edit($('#domainPASSelection').find(':selected').val()).getSession().getValue();
    var probText = window.ace.edit($('#problemPASSelection').find(':selected').val()).getSession().getValue();
    var planText = "";

    var valcall = !($('#planPASSelectionGroup').hasClass('hidden'));
    if (valcall) {
        planText = window.ace.edit($('#planPASSelection').find(':selected').val()).getSession().getValue();
    }
    var solverName = $('#solverPASSelection').find(':selected').val();
    window.toastr.info('Running remote planner...');

    var bodyData = {}
    bodyData["domain"] = domText
    bodyData["problem"] = probText
    bodyData["plan"] = planText

    for (const parameter of window.paramatersPAS) {
        if (parameter["name"] != "domain" && parameter["name"] != "problem" && parameter["name"] != "plan") {
            var value = ""
            if (parameter["type"] != "categorical") {
                var value = $('#' + parameter["name"] + "PAS").val();
            } else {
                var value = $('#' + parameter["name"] + "PAS").find(':selected').val();
            }
            bodyData[parameter["name"]] = value;
        }
    }
    $('#chooseFilesPASModel').modal('toggle');

    var solverURL = window.PASURL + "/package/" + solverName;
    if (valcall)
        solverURL += "/validate";
    else
        solverURL += "/solve";

    // Send task to the solver
    $.ajax({
        url: solverURL,
        type: "POST",
        contentType: 'application/json',
        data: JSON.stringify(bodyData)
    })
        .done(function (res) {
            if ("result" in res) {
                window.toastr.success('Task Initiated!');
                // Check the plan result

                getPlan(res["result"], 0);

            }

        }).fail(function (xhr) {
            if (xhr.status == 429) {
                window.toastr.error('Server is busy, try again after 20 Seconds.');
            } else {
                window.toastr.error('Error: Malformed URL?');
            }
        });

}


function choosePASFiles(type) {

    window.action_type = type
    window.file_choosers[type].showChoice();

    var domain_option_list = "";
    var problem_option_list = "";
    var unknown_option_list = "";
    var hr_line = "<option disabled=\"disabled\">---------</option>\n";
    var setDom = false;
    var setProb = false;


    for (var i = 0; i < window.pddl_files.length; i++) {
        if ($.inArray(window.pddl_files[i], window.closed_editors) == -1) {
            if (window.pddl_files[i] == window.last_domain)
                setDom = true;
            if (window.pddl_files[i] == window.last_problem)
                setProb = true;

            var option = "<option value=\"" + window.pddl_files[i] + "\">" + $('#tab-' + window.pddl_files[i]).text() + "</option>\n";
            var file_text = window.ace.edit(window.pddl_files[i]).getSession().getValue();
            if (file_text.indexOf('(domain') !== -1)
                domain_option_list += option;
            else if (file_text.indexOf('(problem') !== -1)
                problem_option_list += option;
            else
                unknown_option_list += option;
        }
    }

    var domain_list = domain_option_list + hr_line + unknown_option_list + hr_line + problem_option_list;
    var problem_list = problem_option_list + hr_line + unknown_option_list + hr_line + domain_option_list;
    var plan_list = unknown_option_list + hr_line + domain_option_list + hr_line + problem_option_list;
    $('#domainPASSelection').html(domain_list);
    $('#problemPASSelection').html(problem_list);
    $('#planPASSelection').html(plan_list);
    if (setDom)
        $('#domainPASSelection').val(window.last_domain);
    if (setProb)
        $('#problemPASSelection').val(window.last_problem);
    $('#chooseFilesPASModel').modal('toggle');
}

define(function () {

    // Use this as the default solver url
    window.PASURL = "https://solver.planning.domains:5001";

    // Use a flag to only insert styles once
    window.PASSolverStyled = false;

    // Create a store for the plans that are computed
    window.plans = {};

    // Use a flag to only insert styles once
    window.solverStyled = false;

    return {

        name: "Planning-as-a-Service Plugin",
        author: "Christian Muise, Nir Lipovetzky, Yi Ding",
        email: "nir.lipovetzky@unimelb.edu.au",
        description: "Plugin to call the solver provided by Planning-as-a-Service",

        initialize: function () {
            // This will be called whenever the plugin is loaded or enabled

            // add menu item on the top menu
            window.add_menu_button('Solver', 'pasMenuItem', 'glyphicon-dashboard', "choosePASFiles('PaaS')");
            window.register_file_chooser('PaaS',
                {
                    showChoice: function () {

                        window.action_type = 'PaaS'
                        $('#plannerPASURL').val(window.PASURL);
                    },
                    selectChoice: runPAS
                });

            if (!(window.PASSolverStyled)) {
                $('body').append(PAS_MODEL);
                window.PASSolverStyled = true;
            }

            if (!(window.solverStyled)) {
                $('body').append(SOLVER_OUTPUT_MODAL);
                window.inject_styles(SOLVER_STYLE);
                window.solverStyled = true;
            }

            getAllPlanner();

        },

        disable: function () {
            // This is called whenever the plugin is disabled
            window.remove_menu_button('pasMenuItem');
        },

        save: function () {
            // Used to save the plugin settings for later
            return { PASURL: window.PASURL };
        },

        load: function (settings) {
            // Restore the plugin settings from a previous save call
            window.PASURL = settings['PASURL'];
        }

    };
});
