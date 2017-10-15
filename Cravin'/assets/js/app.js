var config = {
    apiKey: "AIzaSyAfZPBHzrGWnwIrnZTZrw8LBet6cKYPIoM",
    authDomain: "codersbay-a751d.firebaseapp.com",
    databaseURL: "https://codersbay-a751d.firebaseio.com",
    projectId: "codersbay-a751d",
    storageBucket: "codersbay-a751d.appspot.com",
    messagingSenderId: "1033281453498"
};

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
    mapsEmbed: "AIzaSyAwobEcHv202FHv77LcDWxJCrbDNaxqUoE",
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
    yelpBestMatch: "GET https://api.yelp.com/v3/businesses/matches/best",
};

function getDatabaseLocation(uid) {
    return "users/" + uid;
}


// Thank you StackOverflow.
// Finds the distance between two locations, used for sort.
function distance(lat1, lon1, lat2, lon2) {
    var radlat1 = Math.PI * lat1 / 180
    var radlat2 = Math.PI * lat2 / 180
    var radlon1 = Math.PI * lon1 / 180
    var radlon2 = Math.PI * lon2 / 180
    var theta = lon1 - lon2
    var radtheta = Math.PI * theta / 180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)
    dist = dist * 180 / Math.PI
    dist = dist * 60 * 1.1515
    return dist
}

firebase.initializeApp(config);
var database = firebase.database();
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
        sortByPrice: function (a, b) {
            if (a.price_range < b.price_range) {
                return -1;
            }
            if (a.price_range > b.price_range) {
                return 1;
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
                database.ref(getDatabaseLocation(app.currentUser.uid)).update({
                    currentCityId: app.currentUser.currentCityId,
                    currentCity: app.currentUser.currentCity,
                    currentState: app.currentUser.currentState,
                });
            });
        },
        getCraving: function () {

        },
        showAlert(title, body) {

            $("#alert-title").text(title);
            $("#alert-body").text(body);
            $("#alert-modal").modal();
        },
        showLoadingScreen: function () {
            $("#loading-screen").css("display", "block");
        },
        hideLoadingScreen: function () {
            $("#loading-screen").css("display", "none");
        },
        switchScreens: function (closeId, openId, callback) {
            $(closeId).animate({ opacity: 0 }, 500, function () {
                $(closeId).css({ "display": "none", "height": 0 });
                $(openId).css({ "display": "block", "min-height": "85vh" });
                $(openId).animate({ opacity: 1 }, 500, function () {
                    if (callback) {
                        callback();
                    }
                });
            });
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
            $("#btn-find-craving").on('click', function () {
                if (app.currentCraving === 0) {
                    app.showAlert("No craving", "Please select a craving to continue!");
                }
                app.showLoadingScreen();
                var callUrl = `${ apiUrls.zomatoBase }/search?lat=${ app.latLong[0] }&lon=${ app.latLong[1] }&cuisines=${ app.currentCraving }&radius=9000`;
                app.restaurantResults.length = 0;

                app.callApi("get", callUrl, apiKeys.zomato.header, function (response) {

                    response.restaurants.forEach(function (currentValue) {
                        var rest = currentValue.restaurant;
                        var newRestaurant = new Restaurant(rest.id, rest.name, rest.location.address, rest.location.latitude, rest.location.longitude,
                            rest.thumb, rest.price_range, rest.average_cost_for_two, rest.featured_image, rest.user_rating.aggregate_rating);
                        newRestaurant.distance = distance(app.latLong[0], app.latLong[1], newRestaurant.lat, newRestaurant.lon);


                        app.restaurantResults.push(newRestaurant);
                    });
                    console.log(app.restaurantResults);
                    app.restaurantResults.sort(app.sortByDistance);

                    app.hideLoadingScreen();
                })
            });
            $("#btn-sign-in").on("click", function () {
                firebase.auth().signInWithRedirect(provider);
            });
            $("#btn-go").on('click', function () {
                app.selectedRestaurant = app.restaurantResults[0];
                callUrl = `${ apiUrls.googlePlacesSearch }&location=${ app.selectedRestaurant.lat },${ app.selectedRestaurant.lon }&rankby=distance&name=${ app.selectedRestaurant.name }`;
                app.callApi("get", callUrl, {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "https://danorlovsky.github.io/",
                    "Access-Control-Allow-Headers": "Content-Type"
                }, function (response) {
                    console.log(response);
                });
            });
            firebase.auth().getRedirectResult().then(function (result) {
                if (result.credential) {
                    var token = result.credential.accessToken;
                }
                app.currentUser = result.user;
                if (result.user != null) {

                    database.ref(getDatabaseLocation(app.currentUser.uid)).once("value", function (snapshot) {
                        var userData = snapshot.val();
                        console.log(userData);
                        if (!userData) {
                            app.currentUser = new User(app.currentUser.uid, app.currentUser.displayName, app.currentUser.email, app.currentUser.photoURL);
                            database.ref(getDatabaseLocation(app.currentUser.uid)).update(app.currentUser);
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
                    databaseLocation = getDatabaseLocation(user.uid);
                    app.currentUser = user;
                    navigator.geolocation.getCurrentPosition(function (position) {
                        app.latLong = [position.coords.latitude, position.coords.longitude];
                        console.log(app.latLong);
                        app.getCity();

                    });
                    console.log("Open cravings!");
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