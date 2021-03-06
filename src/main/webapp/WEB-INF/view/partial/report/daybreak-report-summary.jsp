<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="shiro" uri="http://shiro.apache.org/tags" %>

<shiro:authenticated>
<div class="row margin-top-20">
    <div class="small-4 columns">
        <h4><span class="icon-statistics blue-title-icon"></span>{{title}}</h4>
    </div>
    <div class="small-offset-1 small-7 columns">
        <div class="row">
            <form novalidate>
                <div class="row collapse">
                    <div class="columns small-1 small-offset-1">
                        <span class="prefix">From</span>
                    </div>
                    <div class="columns small-3">
                        <div class="row collapse">
                            <select style="border-right:none;" name="from-month" class="columns small-6" ng-model="dateRange.startMonth"
                                    ng-options="month.name for month in monthList"></select>
                            <select name="from-year" class="columns small-6" ng-model="dateRange.startYear"
                                    ng-options="year.value for (key, year) in yearList"></select>
                        </div>
                    </div>
                    <div class="columns small-1" style="margin-left:25px;">
                        <span class="prefix">To</span>
                    </div>
                    <div class="columns small-3">
                        <div class="row collapse">
                            <select style="border-right:none;" name="to-month" class="columns small-6" ng-model="dateRange.endMonth"
                                    ng-options="month.name for month in monthList"></select>
                            <select name="to-year" class="columns small-6" ng-model="dateRange.endYear"
                                    ng-options="year.value for (key, year) in yearList"></select>
                        </div>
                    </div>
                    <div class="columns small-2">
                        <a ng-click="updateSummaries()" href="#" class="button tiny">Update</a>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>
<section class="row" ng-show="!showSummaries">
    <div id="noDataAvailable" class="panel">
        <h3><span class="icon-warning prefix-icon"></span>No report data available within this range.</h3>
    </div>
</section>
<section class="row" ng-class="{minopacity: !showSummaries}">
    <!-- Chart Thing -->
    <div class="row">
        <section class="columns small-12 reportChart">
            <div id="report-chart-area" class="reportChart" style="display:block"></div>
        </section>
    </div>
    <br/>
    <div class="row">
        <table id="daybreakSummaryTable" class="columns small-12" style="padding:0;">
            <thead>
            <tr>
                <th rowspan="2">Report Date/Time</th>
                <th class="th-section"  colspan="4">Mismatch Statuses</th>
                <th class="th-section" colspan="16">Mismatch Types</th>
            </tr>
            <tr>
                <th style="border-left:1px solid #ccc;">Total Open</th>
                <th>New/Re-opened</th>
                <th>Existing</th>
                <th>Resolved</th>
                <th style="border-left:1px solid #ccc;" colspan="2">Sponsor</th>
                <th colspan="2">Co-sp</th>
                <th colspan="2">Multi-sp</th>
                <th colspan="2">Title</th>
                <th colspan="2">Law/ Summary</th>
                <th colspan="2">Action</th>
                <th colspan="2">Page</th>
                <th colspan="2">Publish</th>
            </tr>
            </thead>
            <tbody>
            <tr ng-repeat="r in summaries.reports.items">
                <td><a ng-href="${ctxPath}/admin/report/daybreak/{{r.reportDateTime | moment}}">{{r.reportDateTime | moment:'lll'}}</a></td>
                <td style="border-left:1px solid #ccc; font-weight:bold">{{r.openMismatches}}</td>
                <td>
                    <span class="prefix-icon icon-arrow-up4 new-error"></span>
                    {{ (r.mismatchStatuses['NEW'] | default:0) + (r.mismatchStatuses['REGRESSION'] | default:0) }}
                </td>
                <td>
                    <span class="prefix-icon icon-cycle existing-error"></span>
                    {{ r.mismatchStatuses['EXISTING'] | default:0 }}
                </td>
                <td>
                    <span class="prefix-icon icon-arrow-down5 closed-error"></span>
                    {{ r.mismatchStatuses['RESOLVED'] | default:0 }}
                </td>
                <td style="border-left:1px solid #ccc;">
                    {{ computeMismatchCount(r, 'BILL_SPONSOR') }}
                </td>
                <td class="delta-column">
                    <span ng-class="mismatchDiffClass(r,'BILL_SPONSOR')">{{ computeMismatchDiff(r, 'BILL_SPONSOR', true) }}</span>
                </td>
                <td>
                    {{ computeMismatchCount(r, 'BILL_COSPONSOR') }}
                </td>
                <td class="delta-column">
                    <span ng-class="mismatchDiffClass(r,'BILL_COSPONSOR')">{{ computeMismatchDiff(r, 'BILL_COSPONSOR', true) }}</span>
                </td>
                <td>
                    {{ computeMismatchCount(r, 'BILL_MULTISPONSOR') }}
                </td>
                <td class="delta-column">
                    <span ng-class="mismatchDiffClass(r,'BILL_MULTISPONSOR')">{{ computeMismatchDiff(r, 'BILL_MULTISPONSOR', true) }}</span>
                </td>
                <td>
                    {{ computeMismatchCount(r, 'BILL_TITLE') }}
                </td>
                <td class="delta-column">
                    <span ng-class="mismatchDiffClass(r,'BILL_TITLE')">{{ computeMismatchDiff(r, 'BILL_TITLE', true) }}</span>
                </td>
                <td>
                    {{ computeMismatchCount(r, 'BILL_LAW_CODE_SUMMARY') }}
                </td>
                <td class="delta-column">
                    <span ng-class="mismatchDiffClass(r,'BILL_LAW_CODE_SUMMARY')">{{ computeMismatchDiff(r, 'BILL_LAW_CODE_SUMMARY', true) }}</span>
                </td>
                <td>
                    {{ computeMismatchCount(r, 'BILL_ACTION') }}
                </td>
                <td class="delta-column">
                    <span ng-class="mismatchDiffClass(r,'BILL_ACTION')">{{ computeMismatchDiff(r, 'BILL_ACTION', true) }}</span>
                </td>
                <td>
                    {{ computeMismatchCount(r, 'BILL_FULLTEXT_PAGE_COUNT') }}
                </td>
                <td class="delta-column">
                    <span ng-class="mismatchDiffClass(r,'BILL_FULLTEXT_PAGE_COUNT')">{{ computeMismatchDiff(r, 'BILL_FULLTEXT_PAGE_COUNT', true) }}</span>
                </td>
                <td>
                    {{ computeMismatchCount(r, 'BILL_AMENDMENT_PUBLISH') }}
                </td>
                <td class="delta-column" style="border-right:none;">
                   <span ng-class="mismatchDiffClass(r,'BILL_AMENDMENT_PUBLISH')">{{ computeMismatchDiff(r, 'BILL_AMENDMENT_PUBLISH', true) }}</span>
                </td>
            </tr>
            </tbody>
        </table>
    </div>
</section>
</shiro:authenticated>