//==============================================================================//
// vma_backend.ks.js                                                            //
// Project: Virtual Meeting Assistance App                                      //
// Developed by: SJC In House Development Team                                  //
//==============================================================================//

// BASE SETUP OF THE BACKEND APP IN NODEJS                                      //
// =============================================================================//

// Call the packages the application will be using
var express = require('express'); // call express web server framework
var app = express(); // define our app using express
var bodyParser = require('body-parser'); // call body-parser to parse the content to be transmitted
var mysql = require('mysql'); // call mysql controllers
//var traverse = require ('traverse');

//DB concurrent connections definition, very important for production environment, should be in line to what we defined PM2.
var pool = mysql.createPool({
    connectionLimit: 100, //important
    host: 'us-cdbr-azure-southcentral-e.cloudapp.net',
    user: 'b853bb49b9939f',
    password: '3234cc43',
    port: '3306',
    debug: false,
    database: 'vma_db',
    dateStrings: 'date',
    protocol: 'mysql'
});

//Configure Cors to allow cross domain calls
var corsOptions = '*';

//Configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

var port = process.env.PORT || 8000;

// =============================================================================//

// MIDDLEWARE DEFINITION                                                        //
// =============================================================================//

var router = express.Router(); // get instance of the express Router

// middleware to use for all requests.
router.use(function (req, res, next) {
    // do logging on console administrator to track when a user use any service exposed by the app
    console.log('Called the Data Base');
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.setHeader('Access-Control-Allow-Origin', corsOptions);
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
    } else {
        return next();
    }
});
// =============================================================================//

// ROUTES FOR THE APIs                                                          //
// =============================================================================//

// =============================================================================//
//ROUTE # 1                                                                     //
// =============================================================================//
router.get("/fetchmeetings", function (req, res) {
    var data = {
        "Data": ""
    };
    pool.query("Select  idmeeting, dateto, description, requester, sponsor, meeting_cost, timefrom, timeto, costcenter,pretestdate, pretesttimefrom, pretesttimeto from meeting WHERE dateto >= curdate() ORDER BY dateto ASC", function (err, rows, fields) { //later change to parametrized query to avoid SQL Injection
        //pool.query("SELECT * from meeting WHERE dateto >= curdate() ORDER BY dateto ASC", function(err, rows, fields) { //later change to parametrized query to avoid SQL Injection
        //pool.end();
        if (!err) {
            if (rows.length == 0) {
                res.json('No Data');
            } else {
                data["Data"] = rows;
                res.statusCode = 200;
                res.json(data);
            }

        } else {
            console.log('Error while performing Query.');
            console.log(err);
            res.statusCode = 500;
            res.json('Error while performing Query to Data Base');
        }

    });
});

// =============================================================================//
//ROUTE # 2                                                                     //
// =============================================================================//
router.get("/fetchmeeting", function (req, res) {
    var data = {
        "Data": ""
    };
    var readRecord = 'select * from meeting WHERE idmeeting = ?';
    var idmeeting = {
        idmeeting: req.query.idmeeting
    }; //do not know why using variable updates all records. fixed by putting direct the req.query.idsite_md
    pool.query(readRecord, req.query.idmeeting, function (err, rows, fields) {
        if (!err) {
            if (rows.length == 0) {
                res.json('Meeting not found');
            } else {
                data["Data"] = rows;
                res.statusCode = 200;
                res.json(data);
            }

        } else {
            console.log('Error while performing Query.');
            console.log(err);
            res.statusCode = 500;
            res.json('Error while performing Query to Data Base');
        }
    });
});

// =============================================================================//
//ROUTE # 2                                                                     //
// =============================================================================//
router.get("/fetchchecklist", function (req, res) {
    var data = {};
    var readRecord = 'SELECT meeting_checklist.*, service_md.idservice_md, service_md.description as service_name, meeting_site_view.idsite_md,meeting_site_view.description as site_name from service_md, meeting_checklist, meeting_site_view WHERE meeting_checklist.idmeeting = meeting_site_view.idmeeting AND meeting_checklist.idservice_md = service_md.idservice_md AND meeting_site_view.idsite_md = meeting_checklist.idsite_md AND meeting_checklist.idmeeting = ?';
    var idmeeting = {
        idmeeting: req.query.idmeeting
    }; //do not know why using variable updates all records. fixed by putting direct the req.query.idsite_md
    pool.query(readRecord, req.query.idmeeting, function (err, rows, fields) {
        if (!err) {
            if (rows.length == 0) {
                res.json('Meeting not found');
            } else {
                data = rows;
                var newObj = [];

                for (var i in data) {
                    var checklistObj = data[i];
                    var newItem = {};
                    var foundItem = false;
                    for (var j in newObj) {
                        var existingItem = newObj[j];
                        if (newObj[j].hasOwnProperty(checklistObj.idsite_md)) {
                            foundItem = j;
                        }
                    }

                    if (!foundItem) {
                        newItem[checklistObj.idsite_md] = {};
                        newItem[checklistObj.idsite_md][checklistObj.site_name] = [];
                        var service_name = {};
                        service_name[checklistObj.service_name] = {
                            checklist_status: checklistObj.checklist_status
                        };
                        newItem[checklistObj.idsite_md][checklistObj.site_name].push(service_name);
                        newObj.push(newItem);
                    } else {
                        var service_name = {};
                        service_name[checklistObj.service_name] = {
                            checklist_status: checklistObj.checklist_status
                        };
                        newObj[foundItem][checklistObj.idsite_md][checklistObj.site_name].push(service_name);
                        // newObj[foundItem][checklistObj.idsite_md][checklistObj.site_name].push(checklist_status);
                    }
                }
                res.statusCode = 200;
                res.json(newObj);
            }

        } else {
            console.log('Error while performing Query.');
            console.log(err);
            res.statusCode = 500;
            res.json('Error while performing Query to Data Base');
        }
    });
});

//// =============================================================================//
////ROUTE # 2                                                                     //
//// =============================================================================//
router.get("/fetchmeetingstatus", function (req, res) {
    var data = {};
    var readRecord = 'select * from site_status, issue_md, meeting_site_view WHERE site_status.idmeeting = meeting_site_view.idmeeting and site_status.idissue = issue_md.idissue and site_status.idsite_md = meeting_site_view.idsite_md  and meeting_site_view.idmeeting=? ORDER BY meeting_site_view.region';
    var idmeeting = {
        idmeeting: req.query.idmeeting
    }; //do not know why using variable updates all records. fixed by putting direct the req.query.idsite_md
    pool.query(readRecord, req.query.idmeeting, function (err, rows, fields) {
        if (!err) {
            if (rows.length == 0) {
                res.json('Meeting not found');
            } else {
                data = rows;
                var newObj = [];

                for (var i in data) {
                    var checklistObj = data[i];
                    var newItem = {};
                    var foundItem = false;
                    var country = {};
                    var description = {};
                    for (var j in newObj) {
                        var existingItem = newObj[j];
                        if (newObj[j].hasOwnProperty(checklistObj.idsite_status)) {
                            foundItem = j;
                            //  console.log(foundItem);
                        }
                    }

                    if (!foundItem) {
                        newItem[checklistObj.idsite_status] = {};
                        newItem[checklistObj.idsite_status][checklistObj.region] = [];
                        country[checklistObj.country] = [];
                        newItem[checklistObj.idsite_status][checklistObj.region].push(country)
                        description[checklistObj.description] = {
                            numberofparticipants: checklistObj.numberofparticipants,
                            status: checklistObj.status,
                            cast_type: checklistObj.cast_type
                        };
                        country[checklistObj.country] = description;
                        newObj.push(newItem);
                    } else {
                        description[checklistObj.description] = {
                            numberofparticipants: checklistObj.numberofparticipants,
                            status: checklistObj.status,
                            cast_type: checklistObj.cast_type
                        };
                        newObj[foundItem][checklistObj.idsite_status][checklistObj.region].push(description);
                        // newObj[foundItem][checklistObj.idsite_md][checklistObj.site_name].push(checklist_status);
                    }
                    //  if (!foundItem) {
                    //     newItem[checklistObj.idsite_status]={};
                    //     newItem[checklistObj.idsite_status][checklistObj.region] = [];
                    //     country[checklistObj.country] = [checklistObj.description];
                    //     country[checklistObj.description] = { status: checklistObj.status };
                    //     newItem[checklistObj.idsite_status][checklistObj.region].push(country);
                    //     newItem[checklistObj.idsite_status][checklistObj.region].push(description);
                    //     newObj.push(newItem);
                    //     console.log(newItem);
                    // } else {
                    //     newObj[foundItem][checklistObj.idsite_status][checklistObj.region].push(country);
                    //     newObj[foundItem][checklistObj.idsite_status][checklistObj.region].push(description);
                    //     console.log(newObj);
                    // }
                }
                res.statusCode = 200;
                res.json(newObj);
            }

        } else {
            console.log('Error while performing Query.');
            console.log(err);
            res.statusCode = 500;
            res.json('Error while performing Query to Data Base');
        }
    });
});

// =============================================================================//
//ROUTE # 2                                                                     //
// =============================================================================//

router.get("/fetchallmeetingstatus", function (req, res) {
    var data = {
        "Data": ""
    };
    var readRecord = 'select * from site_status, issue_md, meeting_site_view WHERE site_status.idmeeting = meeting_site_view.idmeeting and site_status.idissue = issue_md.idissue and site_status.idsite_md = meeting_site_view.idsite_md';
    var idmeeting = {
        idmeeting: req.query.idmeeting
    }; //do not know why using variable updates all records. fixed by putting direct the req.query.idsite_md
    pool.query(readRecord, req.query.idmeeting, function (err, rows, fields) {
        if (!err) {
            if (rows.length == 0) {
                res.json('Meeting not found');
            } else {
                data["Data"] = rows;
                res.statusCode = 200;
                res.json(data);
            }

        } else {
            console.log('Error while performing Query.');
            console.log(err);
            res.statusCode = 500;
            res.json('Error while performing Query to Data Base');
        }
    });
});

// =============================================================================//
//ROUTE # 2                                                                     //
// =============================================================================//

router.get("/fetch", function (req, res) {
    var data = {
        "Data": ""
    };
    var readRecord = 'select * from site_status, issue_md, meeting_site_view WHERE site_status.idmeeting = meeting_site_view.idmeeting and site_status.idissue = issue_md.idissue and site_status.idsite_md = meeting_site_view.idsite_md GROUP BY meeting_site_view.country'; //do not know why using variable updates all records. fixed by putting direct the req.query.idsite_md
    pool.query(readRecord, req.query.idmeeting, function (err, rows, fields) {
        if (!err) {
            if (rows.length == 0) {
                res.json('Meeting not found');
            } else {
                data["Data"] = rows;

                res.statusCode = 200;
                res.json(data);
            }

        } else {
            console.log('Error while performing Query.');
            console.log(err);
            res.statusCode = 500;
            res.json('Error while performing Query to Data Base');
        }
    });
});


// =============================================================================//
//ROUTE # 3                                                                     //
// =============================================================================//
router.get("/fetchmeetingsdetail", function (req, res) {
    var data = {
        "Data": ""
    };
    var readRecord = 'SELECT * FROM dbvma.meeting, dbvma.meeting_detail,dbvma.site_md WHERE dbvma.meeting.idmeeting = dbvma.meeting_detail.idmeeting AND dbvma.meeting_detail.idsite_md = dbvma.site_md.idsite_md';
    pool.query(readRecord, req.query.idmeeting, function (err, rows, fields) { //later change to parametrized query to avoid SQL Injection
        if (!err) {
            if (rows.length == 0) {
                res.json('Meeting not found');
            } else {
                data["Data"] = rows;
                res.statusCode = 200;
                res.json(data);
            }

        } else {
            console.log('Error while performing Query.');
            console.log(err);
            res.statusCode = 500;
            res.json('Error while performing Query to Data Base');
        }
    });
});

// =============================================================================//
//ROUTE # 4                                                                     //
// =============================================================================//
router.get("/fetchservices_md", function (req, res) {
    var data = {
        "Data": ""
    };
    pool.query("SELECT * FROM dbvma.service_md", function (err, rows, fields) { //later change to parametrized query to avoid SQL Injection
        if (!err) {
            if (rows.length == 0) {
                res.json('Meeting not found');
            } else {
                data["Data"] = rows;
                res.statusCode = 200;
                res.json(data);
            }

        } else {
            console.log('Error while performing Query.');
            console.log(err);
            res.statusCode = 500;
            res.json('Error while performing Query to Data Base');
        }
    });
});
// =============================================================================//
//ROUTE # 5                                                                     //
// =============================================================================//
router.get("/fetchsites_md", function (req, res) {
    var data = {
        "Data": ""
    };
    pool.query("SELECT * FROM dbvma.site_md", function (err, rows, fields) { //later change to parametrized query to avoid SQL Injection
        if (!err) {
            if (rows.length == 0) {
                res.json('Meeting not found');
            } else {
                data["Data"] = rows;
                res.statusCode = 200;
                res.json(data);
            }

        } else {
            console.log('Error while performing Query.');
            console.log(err);
            res.statusCode = 500;
            res.json('Error while performing Query to Data Base');
        }
    });
});
// =============================================================================//
//ROUTE # 5                                                                     //
// =============================================================================//
router.get("/fetchregions_md", function (req, res) {
    var data = {
        "Data": ""
    };
    pool.query("SELECT DISTINCT region FROM dbvma.site_md", function (err, rows, fields) { //later change to parametrized query to avoid SQL Injection
        if (!err) {
            if (rows.length == 0) {
                res.json('No Regions');
            } else {
                data["Data"] = rows;
                res.statusCode = 200;
                res.json(data);
            }

        } else {
            console.log('Error while performing Query.');
            console.log(err);
            res.statusCode = 500;
            res.json('Error while performing Query to Data Base');
        }
    });
});
// =============================================================================//
//ROUTE # 6                                                                     //
// =============================================================================//
router.get("/fetchmeetingdetails", function (req, res) {
    var data = {
        "Data": ""
    };
    pool.query("SELECT * FROM dbvma.meeting_detail", function (err, rows, fields) { //later change to parametrized query to avoid SQL Injection
        if (!err) {
            if (rows.length == 0) {
                res.json('Meeting not found');
            } else {
                data["Data"] = rows;
                res.statusCode = 200;
                res.json(data);
            }

        } else {
            console.log('Error while performing Query.');
            console.log(err);
            res.statusCode = 500;
            res.json('Error while performing Query to Data Base');
        }
    });
});

// =============================================================================//
//ROUTE # 7                                                                     //
// =============================================================================//
var idmeeting;
var error;
var dat
router.post("/entermeeting", function (req, res) { //Think this is parametrization, need to check
    var meeting = {
        pretestdate: req.body.pretestdate,
        pretesttimefrom: req.body.pretesttimefrom,
        pretesttimeto: req.body.pretesttimeto,
        timefrom: req.body.timefrom,
        timeto: req.body.timeto,
        costcenter: req.body.costcenter,
        dateto: req.body.dateto,
        description: req.body.description,
        requester: req.body.requester,
        sponsor: req.body.sponsor,
        meeting_cost: req.body.meeting_cost
    };

    pool.query('INSERT INTO meeting SET ?', meeting, function (err, res) {
        // if(err) throw err;
        if (err) {
            console.log('Error Inserting');
            console.log(err);
        }
        var meetingdetail = req.body.meetingdetail;
        for (var i = 0; i < meetingdetail.length; i++) {
            var detailsttoinsert = {
                sitetype: meetingdetail[i].sitetype,
                numberofparticipants: meetingdetail[i].numberofparticipants,
                idmeeting: res.insertId,
                idsite_md: meetingdetail[i].idsite_md,
                pretestingsite: meetingdetail[i].pretestingsite,
                numberofrooms: meetingdetail[i].numberofrooms
            };
            pool.query('INSERT INTO meeting_detail SET ?', detailsttoinsert, function (err, res) {
                if (err) {
                    console.log('Error Inserting');
                    console.log(err);
                }
                console.log('Last Inserted ID:', res);
            });
            console.log('Last Inserted ID:', res);
            //-----------
            pool.query('SELECT * FROM service_md', function (err, rows) {
                if (err) {
                    console.log('Error reading table');
                    console.log(err);
                } //IF err SELECT * FROM service_md
                for (j = 0; j < rows.length; j++) {
                    var checklist = {
                        idmeeting: res.insertId,
                        idsite_md: 42,
                        idservice_md: rows[j].idservice_md,
                        checklist_status: 0
                    }; //check list var
                    console.log(res);
                    pool.query('INSERT INTO meeting_checklist SET ?', checklist, function (err, res) {
                        if (err) {
                            console.log('Error inserting checklist table');
                            console.log(err);
                        } //IF SELECT INTO MEETING_CHECKLIST
                        console.log('Last Inserted ID:', res);
                    }); //INSERT into check list
                } //for


            }); //POOL QUERY Service_md     
            //----
        }

    });
    res.send();
});

// // =============================================================================//
// //ROUTE # 8                                                                     //
// // =============================================================================//
// router.post("/entermeetingdetails", function (req, res) { //Think this is parametrization, need to check
//     var meetingdetail = {
//         sitetype: req.body.sitetype,
//         numberofparticipants: req.body.numberofparticipants,
//         idmeeting: req.body.idmeeting,
//         idsite_md: req.body.idsite_md,
//         pretestingsite: req.body.pretestingsite,
//         numberofrooms: req.body.numberofrooms

//     };
//     pool.query('INSERT INTO meeting_detail SET ?', meetingdetail, function (err, res) {
//         if (err) {
//             console.log('Error Inserting: ', err);
//         }
//         console.log('Last Inserted ID:', res);
//     });
//     res.send();
// });

// =============================================================================//
//ROUTE # 9                                                                     //
// =============================================================================//
router.post("/enterservice", function (req, res) { //Think this is parametrization, need to check
    var service = {
        description: req.body.description,
        attribute1: req.body.attribute1,
        attribute2: req.body.attribute2,
        attribute3: req.body.attribute3,
        attribute4: req.body.attribute4,
        attribute5: req.body.attribute5
    };
    pool.query('INSERT INTO service_md SET ?', service, function (err, res) {
        // if(err) throw err;
        if (err) {
            console.log('Error Inserting');
            console.log(err);
        }
        console.log('Last insert ID:', res);

    });
    res.send();
});
// =============================================================================//
//ROUTE # 10                                                                    //
// =============================================================================//
router.post("/entersite", function (req, res) { //Think this is parametrization, need to check
    var site = {
        description: req.body.description,
        country: req.body.country,
        site_cost: req.body.site_cost,
        region: req.body.region
    };
    pool.query('INSERT INTO site_md SET ?', site, function (err, res) {
        // if(err) throw err;
        if (err) {
            console.log('Error Inserting');
            console.log(err);
        }
        console.log('Last insert ID:', res);
    });
    res.send();
});
// =============================================================================//
//ROUTE # 11                                                                    //
// =============================================================================//
router.put("/updatesite", function (req, res) {
    var updateRecord = 'UPDATE site_md SET ? WHERE idsite_md = ?';
    var site_update = {
        description: req.body.description,
        country: req.body.country,
        site_cost: req.body.site_cost,
        region: req.body.region
    };
    var idsite_md = {
        idsite_md: req.query.idsite_md
    }; //do not know why using variable updates all records. fixed by putting direct the req.query.idsite_md
    pool.query(updateRecord, [site_update, req.query.idsite_md], function (err, res) {
        if (err) {
            console.log('Error Updating');
        }
        console.log('Last updated ID:', res);
    });
    res.send();
});
// =============================================================================//
//ROUTE # 12                                                                    //
// =============================================================================//
router.put("/updateservice", function (req, res) {
    var updateRecord = 'UPDATE service_md SET ? WHERE idservice_md = ?';
    var service_update = {
        description: req.body.description,
        attribute1: req.body.attribute1,
        attribute2: req.body.attribute2,
        attribute3: req.body.attribute3,
        attribute4: req.body.attribute4,
        attribute5: req.body.attribute5
    };
    var idservice_md = {
        idservice_md: req.query.idservice_md
    }; //do not know why using variable updates all records. fixed by putting direct the req.query.idsite_md
    pool.query(updateRecord, [service_update, req.query.idservice_md], function (err, res) {
        if (err) {
            console.log('Error Updating');

        }
        console.log('Last updated ID:', res);
    });
    res.send();
});
// =============================================================================//
//ROUTE # 12                                                                    //
// =============================================================================//
router.put("/updatechecklist", function (req, res) {
    var updateRecord = 'UPDATE meeting_checklist SET ? WHERE idchecklist = ?';
    var checklist = {
        checklist_status: req.body.checklist_status
    };
    pool.query(updateRecord, [checklist, req.query.idchecklist], function (err, res) {
        if (err) {
            console.log('Error Updating');
            console.log(err);

        }
        console.log('Last updated ID:', res);
    });
    res.send("Hola");
});
// =============================================================================//
//ROUTE # 13                                                                    //
// =============================================================================//
router.put("/updatemeeting", function (req, res) {
    var updateRecord = 'UPDATE meeting SET ? WHERE idmeeting = ?';
    var meeting_update = {
        pretestdate: req.body.pretestdate,
        pretesttimefrom: req.body.pretesttimefrom,
        pretesttimeto: req.body.pretesttimeto,
        timefrom: req.body.timefrom,
        timeto: req.body.timeto,
        costcenter: req.body.costcenter,
        dateto: req.body.dateto,
        description: req.body.description,
        requester: req.body.requester,
        sponsor: req.body.sponsor,
        meeting_cost: req.body.meeting_cost
    };
    pool.query(updateRecord, [meeting_update, req.query.idmeeting], function (err, res) {
        if (err) {
            console.log('Error Updating');
            console.log(err);
        }
        console.log('Last updated ID:', res);
    });
    res.send();
});
// =============================================================================//
//ROUTE # 14                                                                    //
// =============================================================================//
router.delete("/deleteservice", function (req, res) {
    pool.query('DELETE FROM service_md WHERE idservice_md = ?', req.query.idservice_md, function (err, res) {
        if (err) {
            console.log('Error Deleting');
            console.log(err);
        }
        console.log('Record Deleted:', res);
    });
    res.send();
});
// =============================================================================//
//ROUTE # 15                                                                    //
// =============================================================================//
router.delete("/deletesite", function (req, res) {
    pool.query('DELETE FROM site_md WHERE idsite_md = ?', req.query.idsite_md, function (err, res) {
        if (err) {
            console.log('Error Deleting');
            console.log(err);
        }
        console.log('Record Deleted:', res);
    });
    res.send();
});
// =============================================================================//
//ROUTE # 16                                                                    //
// =============================================================================//
router.delete("/deletemeeting", function (req, res) {
    pool.query('DELETE FROM meeting WHERE idmeeting = ?', req.query.idmeeting, function (err, res) {
        if (err) {
            console.log('Error Deleting');
            console.log(err);
        }
        console.log('Record Deleted:', res);
    });
    res.send();
});

// =====================================================================================//
//REGISTER OUR ROUTES                                                                   //
// All the routes will be prefixed with /api, later create more meaninfull names.       //
// =====================================================================================//

app.use('/api', router);
app.use(function (req, res) {
    res.status(404).send('Bad Request: Your browser sent a request that this server could not understand');
});

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);



//Check later how I can incoporate this to handle server app dumps.
//function handle_database(req,res) {
//     
//     pool.getConnection(function(err,connection){
//         if (err) {
//           connection.release();
//           res.json({"code" : 100, "status" : "Error in connection database"});
//           return;
//         }   
// 
//         console.log('connected as id ' + connection.threadId);
//         
//         connection.query("select * from participantsw",function(err,rows){
//             connection.release();
//             if(!err) {
//                 res.json(rows);
//             }           
//         });
// 
//         connection.on('error', function(err) {      
//               res.json({"code" : 100, "status" : "Error in connection database"});
//               return;     
//         });
//   });
// }