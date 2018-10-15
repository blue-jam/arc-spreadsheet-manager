import Sheet = GoogleAppsScript.Spreadsheet.Sheet;

const API_URL = 'https://kenkoooo.com/atcoder/atcoder-api';
const CONTEST_NAMES = ['ARC', 'AGC'];

interface Submission {
    result: string,
    contest_id: string,
    problem_id: string,
}

interface Problem {
    id: string,
    title: string,
}

const fetchUserAPI = (userName: string, contestName: string): Submission[] => {
    const response = UrlFetchApp.fetch(`${API_URL}/results?user=${userName}`);

    return JSON.parse(response.getContentText())
        .filter((submit: Submission) => submit.result === 'AC')
        .filter((submit: Submission) => submit.contest_id.substr(0, contestName.length) === contestName.toLowerCase());
};

const fetchProblemAPI = () => {
    const response = UrlFetchApp.fetch(`${API_URL}/info/problems`);

    const result: any = {};
    JSON.parse(response.getContentText()).forEach((problem: Problem) => {
        result[problem.id] = problem.title;
    });

    return result;
};

const findRow = (sheet: Sheet, contestName: string) => {
    const offset = sheet.getFrozenRows() + 1;
    const size = sheet.getLastRow() - offset + 1;

    if (size <= 0) {
        return offset - 1;
    }

    const values = sheet.getRange(offset, 1, size, 1).getValues();
    let l = -1;
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

const updateRow = (sheet: Sheet, submission: Submission, problemTitle: string) => {
    let row = findRow(sheet, submission.contest_id.toUpperCase());

    if ((sheet.getRange(row, 1).getValue() as string).toLowerCase() !== submission.contest_id) {
        sheet.insertRowAfter(row);
        row++;
        sheet.getRange(row, 1).setValue(submission.contest_id.toUpperCase());
    }

    const problemNumber = getProblemNumberFromId(submission.problem_id);
    if (typeof problemNumber === 'undefined') {
        return;
    }

    const problemCell = sheet.getRange(row, problemNumber * 2);

    if (typeof problemCell !== 'undefined' && problemCell.isBlank()) {
        const problemURL = `https://beta.atcoder.jp/contests/${submission.contest_id}/tasks/${submission.problem_id}`;
        problemCell.setValue(`=HYPERLINK("${problemURL}", "${problemTitle}")`);
    }
};

function main() {
    const scriptProperties = PropertiesService.getScriptProperties();
    const contestantName = scriptProperties.getProperty('contestantName');
    if (contestantName === null) {
        throw new Error('Failed to load contestantName from a script configuration.');
    }

    const spreadsheetId = scriptProperties.getProperty('spreadsheetId');
    if (spreadsheetId === null) {
        throw new Error('Failed to load spreadsheetId from a script configuration.');
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    const problemTitleDictionary = fetchProblemAPI();

    CONTEST_NAMES.forEach(contestName => {
        const acSubmissions = fetchUserAPI(contestantName, contestName);
        const sheet = spreadsheet.getSheetByName(contestName);

        acSubmissions.forEach((submission) => updateRow(sheet, submission, problemTitleDictionary[submission.problem_id]));
    });
}
