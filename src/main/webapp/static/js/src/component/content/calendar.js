var calendarModule = angular.module('open.calendar', ['open.core']);

calendarModule.factory('CalendarViewApi', ['$resource', function($resource) {
    return $resource(apiPath + '/calendars/:year/:calNo', {
        year: '@year',
        calNo: '@calNo'
    });
}]);

calendarModule.factory('CurrentCalendarIdApi', ['$resource', function($resource) {
    return $resource(apiPath + '/calendars/:year?order=DESC&limit=1', {
        year: '@year'
    });
}]);

calendarModule.factory('CalendarIdsApi', ['$resource', function($resource) {
    return $resource(apiPath + '/calendars/:year', {
        year: '@year'
    });
}]);

calendarModule.factory('CalendarSearchApi', ['$resource', function ($resource) {
    return $resource(apiPath + '/calendars/search', {});
}]);

calendarModule.factory('CalendarUpdatesApi', ['$resource', function ($resource) {
    return $resource(apiPath + '/calendars/:year/:calNo/updates', {
        year: '@year',
        calNo: '@calNo'
    });
}]);

calendarModule.factory('CalendarFullUpdatesApi', ['$resource', function ($resource) {
    return $resource(apiPath + '/calendars/updates/:fromDateTime/:toDateTime/', {
        fromDateTime: '@fromDateTime', toDateTime: '@toDateTime'
    });
}]);

/** --- Calendar View --- */

calendarModule.controller('CalendarViewCtrl', ['$scope', '$rootScope', '$routeParams', '$location', '$q', '$filter', '$timeout',
                                                'CalendarViewApi', 'CurrentCalendarIdApi',
function($scope, $rootScope, $routeParams, $location, $q, $filter, $timeout, CalendarViewApi, CurrentCalendarIdApi) {

    $scope.calendarView = null;

    $scope.calendarHeaderText = "";

    $scope.ctxPath = ctxPath;

    $scope.curr = {activeIndex: 2};

    $scope.pageNames = ['sklerch', 'active-list', 'floor', 'updates'];

    $scope.init = function() {
        $scope.getCalendarViewById($routeParams.year, $routeParams.calNo);
        if ($routeParams.hasOwnProperty('view') && ['active-list', 'sklerch'].indexOf($routeParams['view']) < 0) {
            $scope.tabParam = $routeParams['view'];
        }
        if ('sview' in $routeParams) {
            $scope.previousPage = $routeParams['sview'];
        }

        $scope.$watch('curr.activeIndex', function(newIndex, oldIndex) {
            if (newIndex >=1) {
                $location.search('view', $scope.pageNames[newIndex]);
            } else if (newIndex < 0 || newIndex >= $scope.pageNames.length) {
                $location.search('view', null);
            }
        });
    };

    /** --- Tab / Header Management --- */

    $scope.changeTab = function(pageName) {
        console.log('changing view to', pageName);
        var newIndex = $scope.pageNames.indexOf(pageName);
        if (newIndex >= 0) $scope.curr.activeIndex = newIndex;
    };



    /** --- Get Calendar Data --- */

    // Performs tasks that follow the loading of a new calendar view such as setting the header text and alerting child controllers
    function processNewCalendarView() {

        $scope.calendarNum = $scope.calendarView['calendarNumber'];
        $scope.year = $scope.calendarView['year'];

        // Set the header text
        $scope.setHeaderText("Senate Calendar #" + $scope.calendarView['calendarNumber'] + " " +
                $filter('moment')($scope.calendarView.calDate, 'll'));

        // Alert child scopes of new calendar view
        $rootScope.$emit('newCalendarEvent');

        // Switch to the tab specified for the incoming route or by default the active list or floor tab
        if ($scope.tabParam) {
            $scope.changeTab($scope.tabParam)
        } else if ($scope.calendarView.activeLists.size > 0) {
            $scope.changeTab('active-list');
        } else {
            $scope.changeTab('floor');
        }
    }

    // Loads a calendar according to the specified year and calendar number
    $scope.getCalendarViewById = function (calendarYear, calendarNo) {
        console.log('loading calendar', calendarYear, calendarNo);
        $scope.calendarResponse = CalendarViewApi.get(
            {year: calendarYear, calNo: calendarNo }, function() {
                if ($scope.calendarResponse.success === true) {
                    console.log('received successful calendar response');
                    $scope.calendarView = $scope.calendarResponse.result;
                    processNewCalendarView();
                }
            }, function(response) {
            $scope.setHeaderText(response.data.message);
            $scope.calendarResponse = response.data;
        });
    };

    // Loads the most recent calendar
    function loadCurrentCalendar(year) {
        var response = CurrentCalendarIdApi.get(
            {year: year}, function() {
                if (response['success'] && response['result']['size'] > 0) {
                    $scope.calendarView = response['result']['items'][0];
                    $location.path(ctxPath + '/calendars/' + $scope.calendarView['year'] + '/' + $scope.calendarView['calendarNumber']);
                } else if (year === moment().year()) {
                    loadCurrentCalendar(year - 1);
                }
            });
    }

    // Back to search
    $scope.backToSearch = function() {
        var currentParams = $location.search();
        var url = ctxPath + "/calendars";
        var firstParam = true;
        for (var param in currentParams) {
            if (param != 'view') {
                url += (firstParam ? "?" : "&") + (param == 'sview' ? 'view' : param) + "=" + currentParams[param];
                firstParam = false;
            }
        }
        $location.url(url);
    };

    // Calendar Bill Number Search

    $scope.getCalBillNumUrl = function(calBillNum) {
        var searchTerm = "\\*.billCalNo:" + calBillNum + " AND year:" + $scope.calendarView.year;
        return ctxPath + "/calendars?view=search&search=" + searchTerm;
    };

    $scope.init();
}]);

calendarModule.controller('CalendarActiveListCtrl', ['$scope', '$rootScope', function($scope, $rootScope) {

    $scope.activeLists = [];

    $scope.activeListFilter = {};

    $scope.displayedEntries = [];

    // Creates a list of active list supplementals from a full calendar object in the parent scope
    function populateActiveLists() {
        if ($scope.calendarView) {
            $scope.activeLists = [];
            for (var seqNo = 0; $scope.calendarView.activeLists.items.hasOwnProperty(seqNo); seqNo++) {
                $scope.activeLists.push($scope.calendarView.activeLists.items[seqNo]);
            }
            generateActiveListFilter();
        }
    }

    // Initializes the filter object based on the current active lists
    function generateActiveListFilter() {
        $scope.activeListFilter = {};
        angular.forEach($scope.activeLists, function(activeList) {
            $scope.activeListFilter[activeList['sequenceNumber']] = true;
        });
    }

    // Sets the contents of the displayedEntries based on the currently active filter
    function filterActiveListEntries() {
        $scope.displayedEntries = [];
        angular.forEach($scope.activeLists, function(activeList) {
            if ($scope.activeListFilter[activeList['sequenceNumber']]) {
                $scope.displayedEntries = $scope.displayedEntries.concat(activeList['entries']['items']);
            }
        });
    }

    $rootScope.$on('newCalendarEvent', populateActiveLists);

    $scope.$watch('activeListFilter', filterActiveListEntries, true);

    populateActiveLists();
}]);

calendarModule.controller('FloorCalendarCtrl', ['$scope', '$rootScope', function($scope, $rootScope) {

    $scope.floorCals = {};

    $scope.floorCalFilter = {};

    $scope.floorCalVersions = [];

    $scope.displayedSections = {};

    // Creates a dictionary of floor calendar supplementals from a full calendar object in the parent scope
    function populateFloorCals() {
        if ($scope.calendarView) {
            $scope.floorCals = {};
            if ($scope.calendarView['floorCalendar']['year']) {
                $scope.floorCals = {floor: $scope.calendarView['floorCalendar']};
            }
            if ($scope.calendarView['supplementalCalendars']['size'] > 0) {
                angular.forEach($scope.calendarView['supplementalCalendars']['items'], function (floorCal, version) {
                    $scope.floorCals[version] = floorCal;
                });
            }
            generateFloorCalFilter();
        }
    }

    // Constructs a filter object for the currently loaded floor and supplemental calendars
    function generateFloorCalFilter() {
        $scope.floorCalFilter = {};
        $scope.floorCalVersions = [];
        angular.forEach($scope.floorCals, function(floorCal, version) {
            $scope.floorCalFilter[version] = true;
            $scope.floorCalVersions.push(version);
        });
    }

    // Adds sections and entries to the displayed list for floor calendars that pass the filter
    function filterFloorCalendarEntries() {
        $scope.displayedSections = {};
        angular.forEach($scope.floorCals, function(floorCal, version) {
            if ($scope.floorCalFilter[version]) {
                angular.forEach(floorCal['entriesBySection']['items'], function(section, sectionName) {
                    if (!$scope.displayedSections.hasOwnProperty(sectionName)) {
                        $scope.displayedSections[sectionName] = [];
                    }
                    $scope.displayedSections[sectionName] = $scope.displayedSections[sectionName].concat(section['items'])
                });
            }
        });
    }

    $scope.versionSortValue = function(version) {
        if (version == "floor") {
            return 0;
        } else {
            return version.charCodeAt(0);
        }
    };

    var sectionOrder = [
        'ORDER_OF_THE_FIRST_REPORT',
        'ORDER_OF_THE_SECOND_REPORT',
        'ORDER_OF_THE_SPECIAL_REPORT',
        'THIRD_READING_FROM_SPECIAL_REPORT',
        'THIRD_READING',
        'STARRED_ON_THIRD_READING'
    ];

    $scope.sectionSortValue = sectionOrder.indexOf;

    $rootScope.$on('newCalendarEvent', populateFloorCals);

    $scope.$watch('floorCalFilter', filterFloorCalendarEntries, true);

    populateFloorCals();
}]);

calendarModule.controller('CalendarUpdatesCtrl', ['$scope', '$rootScope', 'CalendarUpdatesApi',
    function($scope, $rootScope, UpdatesApi) {
        $scope.updateResponse = {result:{items: []}};
        $scope.updatesOrder = "ASC";

        $scope.getUpdates = function() {
            if ($scope.year && $scope.calendarNum) {
                $scope.loadingUpdates = true;
                $scope.updateResponse = {result:{items: []}};
                var response = UpdatesApi.get({
                        year: $scope.year,
                        calNo: $scope.calendarNum,
                        detail: true,
                        order: $scope.updatesOrder
                    },
                    function () {
                        $scope.loadingUpdates = false;
                        if (response.success) {
                            $scope.updateResponse = response;
                        }
                    },
                    function () {
                        $scope.loadingUpdates = false;
                    });
            }
        };

        $rootScope.$on('newCalendarEvent', function() {
            $scope.getUpdates();
        });

        $scope.$watch('updatesOrder', function () {
            $scope.getUpdates();
        });
    }]);

/** --- Calendar Search Page --- */

calendarModule.controller('CalendarSearchPageCtrl', ['$scope', '$rootScope', '$routeParams', '$location', '$timeout',
function ($scope, $rootScope, $routeParams, $location, $timeout) {

    $scope.pageNames = ['browse', 'search', 'updates'];

    function init() {
        if ('view' in $routeParams) {
            $scope.changeTab($routeParams['view']);
        }

        $scope.$watch('activeIndex', function(newIndex, oldIndex) {
            if ($scope.pageNames[newIndex]) {
                $location.search('view', $scope.pageNames[newIndex]);
            } else {
                $location.search('view', null);
            }
        })
    }

    $scope.changeTab = function (pageName) {
        console.log('changing view to', pageName);
        $scope.activeIndex = $scope.pageNames.indexOf(pageName);
    };

    $scope.setCalendarHeaderText = function() {
        $timeout(function() {   // Set text on next digest to account for delay in active index change
            var pageName = $scope.pageNames[$scope.activeIndex];
            var newHeader = "8)";

            if (pageName == "search") {
                newHeader = "Search for Calendars";
            } else if (pageName == "browse") {
                newHeader = "Browse Calendars";
            } else if (pageName == "updates") {
                newHeader = "View Calendar Updates";
            }
            $scope.setHeaderText(newHeader);
        });
    };

    $scope.getCalendarUrl = function(year, calNum) {
        var url = ctxPath + "/calendars/" + year + "/" + calNum;
        var firstParam = true;
        for (var param in $location.search()) {
            url += (firstParam ? "?" : "&") + (param == "view" ? "sview" : param) + "=" + $location.search()[param];
            firstParam = false;
        }
        return url;
    };

    $scope.renderCalendarEvent = function() {
        $rootScope.$emit('renderCalendarEvent');
    };

    init();
}]);

calendarModule.controller('CalendarSearchCtrl', ['$scope', '$routeParams', '$location', 'CalendarSearchApi', 'PaginationModel',
function($scope, $routeParams, $location, SearchApi, paginationModel) {

    $scope.searchResults = [];
    $scope.searchResponse = {};

    $scope.pagination = angular.extend({}, paginationModel);

    $scope.searched = false;

    $scope.init = function() {
        if ($routeParams.hasOwnProperty('search')) {
            $scope.searchTerm = $routeParams['search'];
            $scope.termSearch(false);
        }
        $scope.$watch('pagination.currPage', function(newPage, oldPage) {
            if (newPage !== oldPage && $scope.pagination.currPage > 0) {
                if ($scope.pagination.currPage >1 ) {$location.search('searchPage', $scope.pagination.currPage);}
                $scope.termSearch(false);
            }
        })
    };

    // Perform a simple serch based on the current search term
    $scope.termSearch = function(resetPagination) {
        // If pagination is to be reset and it is not on page 1 just change pagination to trigger the watch
        if (resetPagination && $scope.pagination.currPage != 1) {
            $scope.pagination.currPage = 1;
        } else {
            var term = $scope.searchTerm;
            console.log('searching for', term);
            if (term) {
                $location.search('search', term);
                $scope.searched = false;
                $scope.searchResponse = SearchApi.get({
                        term: term, sort: $scope.sort, limit: $scope.pagination.getLimit(),
                        offset: $scope.pagination.getOffset()
                    },
                    function () {
                        $scope.searchResults = $scope.searchResponse.result.items || [];
                        $scope.searched = true;
                        $scope.pagination.setTotalItems($scope.searchResponse.total);
                    });
            } else {
                $scope.searchResults = [];
                $scope.pagination.setTotalItems(0);
                $location.search('search', null);
            }
        }
    };

    $scope.getTotalActiveListBills = function (cal) {
        var count = 0;
        angular.forEach(cal.activeLists.items, function (activeList) {
            count += activeList.totalEntries;
        });
        return count;
    };

    $scope.getTotalFloorBills = function (cal) {
        var count = 0;
        if (cal.floorCalendar.year) {
            count += cal.floorCalendar.totalEntries;
        }
        angular.forEach(cal.supplementalCalendars.items, function (supCal) {
            count += supCal.totalEntries;
        });
        return count;
    };

    $scope.init();
}]);

calendarModule.controller('CalendarBrowseCtrl', ['$scope', '$rootScope', '$routeParams', '$location', '$timeout', '$q', '$mdToast', 'CalendarIdsApi',
function($scope, $rootScope, $routeParams, $location, $timeout, $q, $mdToast, CalendarIdsApi) {

    $scope.eventSources = [];
    $scope.calendarConfig = null;
    $scope.calendarIds = {};
    $scope.requestsInProgress = 0;

    $scope.init = function () {
        $scope.eventSources.push($scope.getEventSourcesObject());
        $scope.calendarConfig = $scope.getCalendarConfig();
        if ('bdate' in $routeParams) {
            $scope.setCalendarDate($routeParams['bdate']);
        } else {
            $scope.renderCalendar();
        }
    };

    $scope.renderCalendar = function () {
        $timeout(function () {
            angular.element('#calendar-date-picker').fullCalendar('render');
        });
    };

    $rootScope.$on('renderCalendarEvent', $scope.renderCalendar);

    $scope.setCalendarDate = function(date) {
        var momentDate = moment(date);
        if (momentDate.isValid()) {
            $timeout(function() {
                angular.element('#calendar-date-picker').fullCalendar('gotoDate', moment(date).toDate());
                $scope.renderCalendar();
            });
        }
    };

    $scope.getCalendarIds = function(year) {
        var deferred = $q.defer();
        var promise = CalendarIdsApi.get({year: year, limit: "all"},
            function() {
                if (promise.success) {
                    $scope.calendarIds[year] = promise.result.items;
                    deferred.resolve($scope.calendarIds);
                } else {
                    deferred.reject("unsuccessful calendar id request");
                }
            });
        return deferred.promise;
    };

    $scope.getEvent = function(calendarId) {
        return {
            title: window.screen.availWidth > 850
                ? "Senate Calendar\n" + calendarId.year +" #" + calendarId.calendarNumber
                : "#" + calendarId.calendarNumber,
            start: calendarId.calDate,
            calNo: calendarId.calendarNumber
            //rendering: 'background'
        };
    };

    $scope.getCalendarEvents = function(start, end, callback) {
        var events = [];
        var calendarIdPromises = [];
        var years = [];
        for (var year = start.getFullYear(); year <= end.getFullYear(); year++) {
            if (!$scope.calendarIds.hasOwnProperty(year)) {
                calendarIdPromises.push($scope.getCalendarIds(year));
                years.push(year);
            }
        }
        if (calendarIdPromises.length > 0) {
            console.log("loading calendar ids for", years.join(", "));
            $scope.showLoadingToast();
        }
        $scope.requestsInProgress += 1;
        $q.all(calendarIdPromises).then(function () {
            for (var year = start.getFullYear(); year <= end.getFullYear(); year++) {
                $scope.calendarIds[year]
                    .map($scope.getEvent)
                    .forEach(function (event) {
                        events.push(event)
                    });
            }
            $scope.requestsInProgress -= 1;
            $scope.hideLoadingToast();
            callback(events);
        });

    };

    $scope.showLoadingToast = function() {
        if ($scope.requestsInProgress < 1) {
            $mdToast.show({
                template: "<md-toast>" +
                          "  loading calendars... " +
                          "  <md-progress-circular md-mode='indeterminate' md-diameter='20'></md-progress-circular>" +
                          "</md-toast>",
                hideDelay: false,
                parent: angular.element("#calendar-date-picker"),
                position: "fit"
            });
        }
    };

    $scope.hideLoadingToast = function () {
        if ($scope.requestsInProgress < 1) {
            $mdToast.hide();
        }
    };

    $scope.getEventSourcesObject = function() {
        return {
            events: $scope.getCalendarEvents,
            allDay: true,
            className: 'calendar-event',
            editable: false
        }
    };

    $scope.onEventClick = function(event, jsEvent, view) {
        $location.url($scope.getCalendarUrl(event.start.getFullYear(), event.calNo));
    };

    // Set the search param to match the currently viewed month
    $scope.viewRenderHandler = function(view, element) {
        var monthStart = moment(view.start);
        if (!monthStart.isSame(moment(), 'month')) {
            $location.search('bdate', monthStart.format("YYYY-MM-DD"));
        } else {
            $location.search('bdate', null);
        }
    };

    $scope.getCalendarConfig = function() {
        return {
            editable: false,
            theme: false,
            header:{
                left: 'prevYear prev,next nextYear today',
                center: 'title',
                right: ''
            },
            viewRender: $scope.viewRenderHandler,
            fixedWeekCount: false,
            aspectRatio: 1.5,
            eventClick: $scope.onEventClick
        };
    };

    $scope.init();
}]);

calendarModule.controller('CalendarFullUpdatesCtrl', ['$scope', '$routeParams', '$location', '$mdToast',
                                                    'CalendarFullUpdatesApi', 'debounce', 'PaginationModel',
function ($scope, $routeParams, $location, $mdToast, UpdatesApi, debounce, PaginationModel) {
    $scope.updateResponse = {};
    $scope.updateOptions = {
        order: "DESC",
        type: "processed",
        detail: true
    };
    var initialTo = moment().startOf('minute');
    var initialFrom = moment(initialTo).subtract(7, 'days');
    $scope.updateOptions.toDateTime = initialTo.toDate();
    $scope.updateOptions.fromDateTime = initialFrom.toDate();

    $scope.pagination = angular.extend({}, PaginationModel);

    function init() {
        if ("uorder" in $routeParams && ["ASC", "DESC"].indexOf($routeParams['uorder']) >= 0) {
            $scope.updateOptions.order = $routeParams['uorder'];
        }
        if ($routeParams.hasOwnProperty('udetail')) {
            $scope.updateOptions.detail = false;
        }
        if ('utype' in $routeParams) {
            if ($routeParams['utype'] == 'published') {
                $scope.updateOptions.type = 'published';
            }
        }
        if ("ufrom" in $routeParams) {
            var from = moment($routeParams['ufrom']);
            if (from.isValid()) {
                $scope.updateOptions.fromDateTime = from.toDate();
            }
        }
        if ("uto" in $routeParams) {
            var to = moment($routeParams['uto']);
            if (to.isValid()) {
                $scope.updateOptions.toDateTime = to.toDate();
            }
        }

    }

    $scope.getUpdates = function (resetPagination) {
        if (resetPagination) {
            $scope.pagination.currPage = 1;
        }
        var from = moment($scope.updateOptions.fromDateTime);
        var to = moment($scope.updateOptions.toDateTime);
        if (from.isAfter(to)) {
            $scope.invalidRangeToast();
            $scope.updateResponse = {};
            $scope.pagination.setTotalItems(0);
        } else if (from.isValid() && to.isValid()) {
            console.log("Getting updates from", from.toISOString(), "to", to.toISOString());
            $scope.loadingUpdates = true;
            $scope.updateResponse = UpdatesApi.get({
                detail: $scope.updateOptions.detail, type: $scope.updateOptions.type,
                fromDateTime: moment($scope.updateOptions.fromDateTime).toISOString(),
                toDateTime: moment($scope.updateOptions.toDateTime).toISOString(),
                limit: $scope.pagination.getLimit(), offset: $scope.pagination.getOffset()
            }, function () {
                $scope.loadingUpdates = false;
                if ($scope.updateResponse.success) {
                    $scope.pagination.setTotalItems($scope.updateResponse.total);
                } else {
                    $scope.pagination.setTotalItems(0);
                }
            }, function () {
                $scope.loadingUpdates = false;
            });
        }
    };

    $scope.invalidRangeToast = function () {
        $mdToast.show({
            template: '<md-toast>from date cannot exceed to date!</md-toast>',
            parent: angular.element('.error-toast-parent')
        });
    };

    init();

    $scope.$watch('updateOptions', function() {
            $scope.getUpdates(true);
            var opts = $scope.updateOptions;
            if (opts.order == "ASC") {
                $location.search("uorder", "ASC");
            } else { $location.search("uorder", null); }
            if (!opts.detail) {
                $location.search("udetail", false);
            } else { $location.search("udetail", null); }
            var to = moment(opts.toDateTime);
            var from = moment(opts.fromDateTime);
            if (to.isValid() && !to.isSame(initialTo)) {
                $location.search("uto", to.toISOString());
            } else { $location.search("uto", null); }
            if (from.isValid() && !from.isSame(initialFrom)) {
                $location.search("ufrom", from.toISOString());
            } else { $location.search("ufrom", null); }
        }, true);

    $scope.$watch('pagination.currPage', function (newPage, oldPage) {
        if (newPage !== oldPage && newPage > 0) {
            $scope.getUpdates(false);
        }
    });
}]);

calendarModule.directive('calendarEntryTable', function() {
    return {
        scope: {
            calEntries: '=calEntries',
            getCalBillNumUrl: '&'
        },
        templateUrl: ctxPath + '/partial/content/calendar/calendar-entry-table',
        controller: function($scope) {
            $scope.billPageBaseUrl = ctxPath + '/bills';
            $scope.getCalBillNumUrl = $scope.getCalBillNumUrl();
        }
    };
});

calendarModule.filter('sectionDisplayName', function() {
    var sectionNameMap = {
       'ORDER_OF_THE_FIRST_REPORT' : "First Report",
       'ORDER_OF_THE_SECOND_REPORT' : "Second Report",
       'ORDER_OF_THE_SPECIAL_REPORT' : "Special Report",
       'THIRD_READING_FROM_SPECIAL_REPORT' : "Third Reading from Special Report",
       'THIRD_READING' : "Third Reading",
       'STARRED_ON_THIRD_READING' : "Starred on Third Reading"
    };
    return function(input) {
        if (sectionNameMap.hasOwnProperty(input)) {
            return sectionNameMap[input];
        }
        else return "* " + input;
    };
});

calendarModule.filter('orderBySection', function() {
    var sectionOrder = [
        'ORDER_OF_THE_FIRST_REPORT',
        'ORDER_OF_THE_SECOND_REPORT',
        'ORDER_OF_THE_SPECIAL_REPORT',
        'THIRD_READING_FROM_SPECIAL_REPORT',
        'THIRD_READING',
        'STARRED_ON_THIRD_READING'
    ];
    return function(obj) {
        var array = [];
        Object.keys(obj).forEach(function(key) { array.push(obj[key]); });
        array.sort(function(a, b) {
            return sectionOrder.indexOf(a.items[0].sectionType) - sectionOrder.indexOf(b.items[0].sectionType);
        });
        return array;
    };
});
