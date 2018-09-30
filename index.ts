const API_URL = 'https://kenkoooo.com/atcoder/atcoder-api';
const CONTEST_NAME = 'ARC';

const fetchUserAPI = (userName: string) => {
    const response = UrlFetchApp.fetch(`${API_URL}/results?user=${userName}`);

    return JSON.parse(response.getContentText())
        .filter(submit => submit.result === 'AC')
        .filter(submit => submit.contest_id.substr(0, 3) === CONTEST_NAME.toLowerCase());
};

const fetchProblemAPI = () => {
    const response = UrlFetchApp.fetch(`${API_URL}/info/problems`);

    const result = {};
    JSON.parse(response.getContentText()).forEach((problem) => {
        result[problem.id] = problem.title;
    });

    return result;
};

const findRow = (sheet: Sheet, contestName: string) => {
    const offset = sheet.getFrozenRows() + 1;
    const size = sheet.getLastRow() - offset + 1;
    const values = sheet.getRange(offset, 1, size, 1).getValues();
    let l = 0;
    let u = size;

    while (u - l > 1) {
        const c = Math.floor((l + u) / 2);
        const value = values[c][0];

        if (value < contestName) {
            u = c;
        } else {
            l = c;
        }
    }

    return offset + l;
};

const getProblemNumberFromId = (problemId: string) => {
    const rest = problemId.split('_').slice(-1)[0];

    if (rest.length != 1) {
        Logger.log(`Failed extract a problem number for ${problemId}`);

        return undefined;
    }

    const id = rest.charAt(0).toLowerCase();
    if('a' <= id && id <= 'z') {
        return id.charCodeAt(0) - 'a'.charCodeAt(0) + 1;
    } else if ('0' <= id && id <= '9') {
        return Number(id);
    } else {
        Logger.log(`Failed extract a problem number for ${problemId}`);

        return undefined;
    }
};

const updateRow = (sheet: Sheet, submission, problemTitle: string) => {
    let row = findRow(sheet, submission.contest_id.toUpperCase());

    if (sheet.getRange(row, 1).getValue().toLowerCase() !== submission.contest_id) {
        sheet.insertRowAfter(row);
        row++;
        const cell = sheet.getRange(row, 1).setValue(submission.contest_id.toUpperCase());
    }

    const problemNumber = getProblemNumberFromId(submission.problem_id);
    const problemCell = sheet.getRange(row, problemNumber * 2);

    if (typeof problemCell !== 'undefined' && problemCell.isBlank()) {
        const problemURL = `https://beta.atcoder.jp/contests/${submission.contest_id}/tasks/${submission.problem_id}`;
        problemCell.setValue(`=HYPERLINK("${problemURL}", "${problemTitle}")`);
    }
};

function main() {
    const scriptProperties = PropertiesService.getScriptProperties();

    const contestantName = scriptProperties.getProperty('contestantName');
    const acSubmissions = fetchUserAPI(contestantName);
    const problemTitleDictionary = fetchProblemAPI();

    const spreadsheetId = scriptProperties.getProperty('spreadsheetId');
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(CONTEST_NAME);

    acSubmissions.forEach((submission) => updateRow(sheet, submission, problemTitleDictionary[submission.problem_id]));
}
