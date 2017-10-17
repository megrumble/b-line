var config = {
        apiKey: "AIzaSyAfZPBHzrGWnwIrnZTZrw8LBet6cKYPIoM",
        authDomain: "codersbay-a751d.firebaseapp.com",
        databaseURL: "https://codersbay-a751d.firebaseio.com",
        projectId: "codersbay-a751d",
        storageBucket: "codersbay-a751d.appspot.com",
        messagingSenderId: "1033281453498"
};
firebase.initializeApp(config);
var database = firebase.database();



function User(uid, name, email, photoURL) {
    this.uid = uid;
    this.name = name;
    this.email = email;
    this.photoURL = photoURL;
    this.currentCityId = 0;
    this.currentCity = "";
    this.currentState = "";
    this.cities = [];
    this.restaurants = [];
    this.userHasEaten = false;
    this.lastRestaurantId = "";
}

function Restaurant(id, name, address, lat, lon, thumb, price_range, average_cost, featured_image, aggregate_rating) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.googleAddress = address.replace(/,/g, "");
    this.googleAddress = this.googleAddress.replace(/ /g, "+");
    this.lat = lat;
    this.lon = lon;
    this.distance = 0;
    this.thumb = thumb;
    this.price_range = price_range;
    this.average_cost = average_cost;
    this.featured_image = featured_image;
    this.aggregate_rating = aggregate_rating;
    this.yelpId = 0;
    this.yelpReviews = [];
    this.userReviews = [];
}


var apiKeys = {
    mapsEmbed: "AIzaSyDqf6wEb0fLt7Wf56hzb84dYQ8OBte-5dE",
    zomato: {
        header: {
            "user-key": "029229483ea9d14f003cd7257516abde"
        },
    },
    yelp: {
        clientId: "dE4ardVf7tro8HdvDguNuA",
        clientSecret: "wdaKsDjLnqLqtp49StvQFag2fhR9p2Rvv5xTkTNtYjX6TyAzLpExHue5xEnpqYkn"
    }

};

var apiUrls = {
    zomatoBase: "https://developers.zomato.com/api/v2.1/",
    yelpBestMatch: "https://api.yelp.com/v3/businesses/matches/best",
    googleDirsUrl: "https://www.google.com/maps/dir/",
    googleGeoLocation: `https://www.googleapis.com/geolocation/v1/geolocate?key=${ apiKeys.mapsEmbed}`,
};

function getUsrDataLoc(uid) {
    return "users/" + uid;
}
function getRestDataLoc(rid) {
    return "restaurants/" + rid;    
}


// Thank you StackOverflow.
// Finds the distance between two locations, used for sort.
function distance(lat1, lon1, lat2, lon2) {
    var p = 0.017453292519943295; // Math.PI / 180
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p) / 2 +
        c(lat1 * p) * c(lat2 * p) *
        (1 - c((lon2 - lon1) * p)) / 2;
    var milesAway = (12742 * Math.asin(Math.sqrt(a))) / 1.609344;
    return (milesAway).toFixed(1); // 2 * R; R = 6371 km
}


var provider = new firebase.auth.GoogleAuthProvider();

$(document).ready(function () {
    var app = {

        latLong: [],
        restaurantResults: [],
        currentUser: null,
        currentCraving: 0,
        routeType: "",
        selectedRestaurant: null,
        sortByDistance: function (a, b) {
            if (a.distance < b.distance) {
                return -1;
            }
            if (a.distance > b.distance) {
                return 1;
            }
            return 0;
        },
        sortByQuality: function (a, b) {
            if (a.aggregate_rating < b.aggregate_rating) {
                return 1;
            }
            if (a.aggregate_rating > b.aggregate_rating) {
                return -1;
            }
            return 0;
        },
        getRestaurantDistances: function () {
            if (app.restaurantResults.length < 0) {
                return;
            }
            var distances = [];
            app.restaurantResults.forEach(function (currentValue) {

            });
        },
        callApi: function (type, url, headers, callback) {
            $.ajax({
                type: type,
                url: url,
                headers: headers,
                success: function (response) {
                    callback(response);
                }
            });
        },

        showCravings: function () {

        },
        getCity: function () {
            var callUrl = `${ apiUrls.zomatoBase }cities?lat=${ this.latLong[0] }&lon=${ this.latLong[1] }`;
            this.callApi("get", callUrl, apiKeys.zomato.header, function (response) {

                app.currentUser.currentCityId = response.location_suggestions[0].id;
                app.currentUser.currentCity = response.location_suggestions[0].name;
                app.currentUser.currentState = response.location_suggestions[0].state_code;
                database.ref(getUsrDataLoc(app.currentUser.uid)).update({
                    currentCityId: app.currentUser.currentCityId,
                    currentCity: app.currentUser.currentCity,
                    currentState: app.currentUser.currentState,
                });
            });
        },
        showAlert(title, body) {

            $("#alert-title").text(title);
            $("#alert-body").text(body);
            $("#alert-modal").modal();
        },
        showLoadingScreen: function () {
            var body = document.body;
            var html = document.documentElement;
            // Since our screens are continually changing the height of the DOM, we find the absolute highest height at the moment.
            var height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
            $("#loading-screen").css({
                "height": height,
                "display": "block"
            });
        },
        hideLoadingScreen: function () {
            $("#loading-screen").css("display", "none");
        },
        switchScreens: function (closeId, openId, callback) {
            $(closeId).animate({
                opacity: 0
            }, 500, function () {
                $(closeId).css({
                    "display": "none",
                    "height": 0,
                    "z-index": "0"
                });
                $(openId).css({
                    "display": "block",
                    "min-height": "85vh",
                    "z-index": "9"
                });

                $(openId).animate({
                    opacity: 1
                }, 500, function () {
                    if (callback) {
                        callback();
                    }
                });
            });
        },
        populateResults: function () {
            app.restaurantResults.forEach(function (currentValue, index) {
                console.log(currentValue.featured_image);
                var resultsBox = $("#results");
                var resultsDisplay = $(`
                    <div class="row justify-content-center">    
                        <div class="col-12">
                            <div class="results-box first-result clearfix">
                                <h3 class="restaurant-name">${ currentValue.name }</h3>
                                <img class="results-image img-fluid img-thumbnail" src="${ currentValue.thumb }" />
                                <div class="restaurant-info">
                                    <h4>Average Rating: ${ currentValue.aggregate_rating }</h4>
                                    <h4>Address: ${ currentValue.address }</h4>
                                    <h4>About ${ currentValue.distance } miles away.</h4>
                                    <h5>
                                        <a href="${ apiUrls.googleDirsUrl }${app.latLong[0]},${app.latLong[1]}/${currentValue.googleAddress}" class="go-to-restaurant" data-index="${ index}">Let's Go!</a>
                                    </h5>
                                </div>
                            </div>
                       </div>
                       
                    </div>`);
                resultsBox.append(resultsDisplay);
            });
        },
        findCraving(type) {
            if (app.currentCraving === 0) {
                app.showAlert("No craving", "Please select a craving to continue!");
                return;
            }
            app.showLoadingScreen();
            var callUrl = `${ apiUrls.zomatoBase }/search?lat=${ app.latLong[0] }&lon=${ app.latLong[1] }&cuisines=${ app.currentCraving }&radius=15000&count=3`;
            app.restaurantResults.length = 0;

            app.callApi("get", callUrl, apiKeys.zomato.header, function (response) {
                console.log(response);
                response.restaurants.forEach(function (currentValue, index) {
                    var rest = currentValue.restaurant;
                    var newRestaurant = new Restaurant(rest.id, rest.name, rest.location.address, rest.location.latitude, rest.location.longitude,
                        rest.thumb, rest.price_range, rest.average_cost_for_two, rest.featured_image, rest.user_rating.aggregate_rating);
                    newRestaurant.distance = distance(app.latLong[0], app.latLong[1], newRestaurant.lat, newRestaurant.lon);
                    app.restaurantResults.push(newRestaurant);

                    if (index === response.restaurants.length - 1) {
                        if (type === "fast") {
                            app.restaurantResults.sort(app.sortByDistance);
                        } else {
                            app.restaurantResults.sort(app.sortByQuality);
                        }

                    }
                });
                console.log(app.restaurantResults);
                app.populateResults();
                app.hideLoadingScreen();

                app.switchScreens("#craving-select-screen", "#results-screen");
            })

        },
        addRestuarantToDb: function(idx, callback) {
            var restaurant = app.restaurantResults[idx];
            var dbRestLoc = getRestDataLoc(restaurant.id);
            var dbUsrLoc = getUsrDataLoc(app.currentUser.uid);
            
            database.ref(dbRestLoc).once("value", function(snapshot) { 
                var restData = snapshot.val();
                if(!restData) {
                    database.ref(dbRestLoc).set(restaurant);
                }
            });
            database.ref(dbUsrLoc).update( { userHasEaten: true, lastRestaurantId: restaurant.id });
        },
        eventListeners: function () {
            $("#btn-sign-out").on("click", function () {
                firebase.auth().signOut().then(function () {
                    $("#btn-sign-in").css("display", "block");
                    // Sign-out successful.
                }).catch(function (error) {
                    // An error happened.
                });
            });
            $(document).on("click", ".go-to-restaurant", function (e) {
                e.preventDefault();
                app.addRestuarantToDb(parseInt($(this).attr("data-index")),function() { 
                    window.open($(this).attr("href"));
                });
            });
            $("#btn-fast").on('click', function (e) {
                e.preventDefault();
                app.findCraving("fast")
            });
            $("#btn-best").on('click', function (e) {
                e.preventDefault();
                app.findCraving("best")
            });

            $("#btn-sign-in").on("click", function () {
                firebase.auth().signInWithRedirect(provider);
            });

            firebase.auth().getRedirectResult().then(function (result) {
                if (result.credential) {
                    var token = result.credential.accessToken;
                }
                app.currentUser = result.user;
                if (result.user != null) {

                    database.ref(getUsrDataLoc(app.currentUser.uid)).once("value", function (snapshot) {
                        var userData = snapshot.val();
                        console.log(userData);
                        if (!userData) {
                            app.currentUser = new User(app.currentUser.uid, app.currentUser.displayName, app.currentUser.email, app.currentUser.photoURL);
                            database.ref(getUsrDataLoc(app.currentUser.uid)).update(app.currentUser);
                        }
                    })
                }
            });
            $(".craving-box").on("click", function () {
                app.currentCraving = $(this).attr("data-craving-id");
                $(".craving-box").each(function () {
                    $(this).find('.craving-check-wrapper').css("display", "none");
                });
                $(this).find('.craving-check-wrapper').css("display", "block");
            })

            firebase.auth().onAuthStateChanged(function (user) {

                if (user) {
                    databaseLocation = getUsrDataLoc(user.uid);
                    app.currentUser = user;
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(function (position) {
                            app.latLong = [position.coords.latitude, position.coords.longitude];
                            console.log(app.latLong);
                            app.getCity();

                        });
                    } else {
                        app.callApi("get", apiUrls.googleGeoLocation, "", function (response) {
                            app.latLong = [ response.location.lat, response.location.lng ];
                        });    
                    }
                    // GO TO THE NEXT PAGE
                    app.switchScreens("#login-screen", "#craving-select-screen");
                } else {
                    $("#btn-sign-in").css("display", "block");

                }
            });

        },

    }
    
    setTimeout(function () {
        app.switchScreens("#splash-screen", "#login-screen");
        app.eventListeners();
    }, 2000);
    if (!("geolocation" in navigator)) {
        // GEOLOCATION IS UNAVAILABLE, CAN'T USE THE APP.
    }


});