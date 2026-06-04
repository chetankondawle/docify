/**
 * Document Type Configuration
 * Defines field mappings and validation rules for each document type
 */

const documentTypeConfig = {
  AADHAAR_CARD: {
    name: 'Aadhaar Card',
    formatRules: {
      aadhaarNumber: {
        required: true,
        rules: [
          { type: 'length', value: 12, message: 'Aadhaar number must be exactly 12 digits' },
          { type: 'numeric', message: 'Aadhaar number must only contain digits (0-9)' },
          { type: 'notStartWith', values: ['0', '1'], message: 'Aadhaar number cannot start with 0 or 1' },
        ],
      },
    },
    fields: {
      name: {
        label: 'Full Name',
        aliases: ['name', 'full_name', 'holder_name', 'cardholder_name'],
        type: 'text',
        matchWith: ['username'],
        matchStrategy: 'substring',
        priority: 'high',
      },
      aadhaarNumber: {
        label: 'Aadhaar Number',
        aliases: ['aadhaar_number', 'aadhaar', 'aadhaar_no', 'uid', 'id_number'],
        type: 'number',
        matchWith: [],
        priority: 'high',
      },
      dateOfBirth: {
        label: 'Date of Birth',
        aliases: ['date_of_birth', 'dob', 'birth_date', 'dateofbirth'],
        type: 'date',
        matchWith: ['dob'],
        matchStrategy: 'dateFormat',
        priority: 'high',
      },
      address: {
        label: 'Address',
        aliases: ['address', 'residential_address'],
        type: 'text',
        matchWith: ['address'],
        matchStrategy: 'substring',
        priority: 'medium',
      },
      gender: {
        label: 'Gender',
        aliases: ['gender', 'sex'],
        type: 'enum',
        priority: 'low',
      },
    },
  },

  PAN_CARD: {
    name: 'PAN Card',
    formatRules: {
      panNumber: {
        required: true,
        rules: [
          { type: 'length', value: 10, message: 'PAN must be exactly 10 characters' },
          { type: 'pattern', value: '^[A-Za-z]{5}[0-9]{4}[A-Za-z]$', message: 'PAN must be 5 letters + 4 digits + 1 letter (e.g., AAAPZ1234C)' },
          { type: 'notStartWith', values: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'], message: 'PAN must start with a letter' },
        ],
      },
    },
    fields: {
      name: {
        label: 'Full Name',
        aliases: ['name', 'full_name', 'holder_name', 'cardholder_name'],
        type: 'text',
        matchWith: ['username'],
        matchStrategy: 'substring',
        priority: 'high',
      },
      panNumber: {
        label: 'PAN Number',
        aliases: ['pan_number', 'pan', 'pan_no', 'pannumber'],
        type: 'text',
        matchWith: [],
        priority: 'high',
      },
      dateOfBirth: {
        label: 'Date of Birth',
        aliases: ['date_of_birth', 'dob', 'birth_date', 'dateofbirth'],
        type: 'date',
        matchWith: ['dob'],
        matchStrategy: 'dateFormat',
        priority: 'high',
      },
      fatherName: {
        label: 'Father\'s Name',
        aliases: ['father_name', 'fathers_name', 'fathername'],
        type: 'text',
        priority: 'medium',
      },
    },
  },

  PASSPORT: {
    name: 'Passport',
    formatRules: {
      passportNumber: {
        required: true,
        rules: [
          { type: 'length', value: 8, message: 'Indian passport number must be exactly 8 characters' },
          { type: 'pattern', value: '^[A-Za-z][0-9]{7}$', message: 'Passport must start with a letter followed by 7 digits (e.g., J1234567)' },
        ],
      },
    },
    fields: {
      name: {
        label: 'Full Name',
        aliases: ['name', 'full_name', 'holder_name'],
        type: 'text',
        matchWith: ['username'],
        matchStrategy: 'substring',
        priority: 'high',
      },
      passportNumber: {
        label: 'Passport Number',
        aliases: ['passport_number', 'passport', 'passport_no', 'number', 'passportnumber'],
        type: 'text',
        matchWith: [],
        priority: 'high',
      },
      dateOfBirth: {
        label: 'Date of Birth',
        aliases: ['date_of_birth', 'dob', 'birth_date', 'dateofbirth'],
        type: 'date',
        matchWith: ['dob'],
        matchStrategy: 'dateFormat',
        priority: 'high',
      },
      gender: {
        label: 'Gender',
        aliases: ['gender', 'sex'],
        type: 'enum',
        priority: 'medium',
      },
      dateOfIssue: {
        label: 'Date of Issue',
        aliases: ['date_of_issue', 'issue_date', 'dateofissue'],
        type: 'date',
        priority: 'low',
      },
      dateOfExpiry: {
        label: 'Date of Expiry',
        aliases: ['date_of_expiry', 'expiry_date', 'dateofexpiry'],
        type: 'date',
        priority: 'low',
      },
    },
  },

  SALARY_SLIP: {
    name: 'Salary Slip',
    formatRules: {},
    fields: {
      employeeName: {
        label: 'Employee Name',
        aliases: ['employee_name', 'name', 'employee', 'employee_full_name', 'employeename'],
        type: 'text',
        matchWith: ['username'],
        matchStrategy: 'substring',
        priority: 'high',
      },
      employeeId: {
        label: 'Employee ID',
        aliases: ['employee_id', 'emp_id', 'id', 'employeeid'],
        type: 'text',
        priority: 'high',
      },
      monthYear: {
        label: 'Month & Year',
        aliases: ['month_year', 'month', 'year', 'monthyear', 'period'],
        type: 'text',
        priority: 'medium',
      },
      basicSalary: {
        label: 'Basic Salary',
        aliases: ['basic_salary', 'salary', 'base', 'basicSalary'],
        type: 'number',
        priority: 'medium',
      },
      allowances: {
        label: 'Allowances',
        aliases: ['allowances', 'allowance'],
        type: 'number',
        priority: 'low',
      },
      deductions: {
        label: 'Deductions',
        aliases: ['deductions', 'deduction'],
        type: 'number',
        priority: 'low',
      },
      netSalary: {
        label: 'Net Salary',
        aliases: ['net_salary', 'net', 'netsalary'],
        type: 'number',
        priority: 'medium',
      },
      employeePanNumber: {
        label: 'Employee PAN',
        aliases: ['employee_pan_number', 'pan', 'pan_number', 'employeepannumber'],
        type: 'text',
        priority: 'low',
      },
    },
  },
};

module.exports = documentTypeConfig;
