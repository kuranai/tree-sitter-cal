const PREC = {
  LOGICAL: 1,
  COMPARE: 2,
  ADD: 3,
  MULTIPLY: 4,
  UNARY: 5,
  MEMBER: 6,
  CALL: 7,
};

module.exports = grammar({
  name: "cal",

  extras: ($) => [/[ \t\f\v\r\n]+/, $.line_comment],

  word: ($) => $.identifier,

  conflicts: ($) => [
    [$.metadata_value, $.expression],
    [$.call_statement, $.assignment_statement],
    [$.property_assignment, $.metadata_value],
    [$.entry_header_cell, $.metadata_value],
    [$.metadata_entry, $.metadata_value],
    [$.primary_expression, $._metadata_part],
    [$.set_literal, $.attribute],
    [$.set_literal, $.bracketed_metadata],
    [$.code_item, $.procedure_declaration],
    [$.procedure_declaration, $.property_assignment],
  ],

  rules: {
    source_file: ($) => seq($.object_declaration),

    object_declaration: ($) =>
      seq(
        $.object_header,
        "{",
        $.object_properties_section,
        choice(
          $.table_object_body,
          $.page_object_body,
          $.report_object_body,
          $.codeunit_object_body,
          $.xmlport_object_body,
          $.query_object_body,
          $.menusuite_object_body,
          repeat($.unknown_section),
        ),
        "}",
      ),

    object_header: ($) =>
      seq(
        keyword("OBJECT"),
        field("object_type", $.object_type),
        field("object_id", $.number_literal),
        field("object_name", $.object_name),
      ),

    object_type: ($) => $.identifier,

    object_name: (_) => token(/[^\r\n{][^\r\n{]*/),

    object_properties_section: ($) =>
      seq(keyword("OBJECT-PROPERTIES"), "{", repeat($.section_item), "}"),

    table_object_body: ($) =>
      seq(
        $.properties_section,
        $.fields_section,
        optional($.keys_section),
        optional($.fieldgroups_section),
        optional($.code_section),
        repeat($.unknown_section),
      ),

    page_object_body: ($) =>
      seq(
        $.properties_section,
        $.controls_section,
        optional($.code_section),
        repeat($.unknown_section),
      ),

    report_object_body: ($) =>
      seq(
        $.properties_section,
        $.dataset_section,
        optional($.requestpage_section),
        optional($.labels_section),
        optional($.code_section),
        optional($.rdldata_section),
        optional($.wordlayout_section),
        repeat($.unknown_section),
      ),

    codeunit_object_body: ($) =>
      seq($.properties_section, $.code_section, repeat($.unknown_section)),

    xmlport_object_body: ($) =>
      seq(
        $.properties_section,
        $.elements_section,
        $.events_section,
        optional($.requestpage_section),
        optional($.code_section),
        repeat($.unknown_section),
      ),

    query_object_body: ($) =>
      seq(
        $.properties_section,
        $.elements_section,
        optional($.code_section),
        repeat($.unknown_section),
      ),

    menusuite_object_body: ($) =>
      seq($.properties_section, $.menunodes_section, repeat($.unknown_section)),

    properties_section: ($) =>
      seq(keyword("PROPERTIES"), "{", repeat($.section_item), "}"),

    fields_section: ($) =>
      seq(keyword("FIELDS"), "{", repeat($.section_item), "}"),

    keys_section: ($) =>
      seq(keyword("KEYS"), "{", repeat($.section_item), "}"),

    fieldgroups_section: ($) =>
      seq(keyword("FIELDGROUPS"), "{", repeat($.section_item), "}"),

    controls_section: ($) =>
      seq(keyword("CONTROLS"), "{", repeat($.section_item), "}"),

    dataset_section: ($) =>
      seq(keyword("DATASET"), "{", repeat($.section_item), "}"),

    elements_section: ($) =>
      seq(keyword("ELEMENTS"), "{", repeat($.section_item), "}"),

    events_section: ($) =>
      seq(keyword("EVENTS"), "{", repeat($.section_item), "}"),

    requestpage_section: ($) =>
      seq(
        keyword("REQUESTPAGE"),
        "{",
        optional($.properties_section),
        optional($.controls_section),
        repeat($.section_item),
        "}",
      ),

    labels_section: ($) =>
      seq(keyword("LABELS"), "{", repeat($.section_item), "}"),

    menunodes_section: ($) =>
      seq(keyword("MENUNODES"), "{", repeat($.section_item), "}"),

    rdldata_section: ($) =>
      seq(
        keyword("RDLDATA"),
        "{",
        repeat($.rdldata_payload_line),
        optional($.rdldata_end),
        "}",
      ),

    wordlayout_section: ($) =>
      seq(
        keyword("WORDLAYOUT"),
        "{",
        repeat($.wordlayout_payload_line),
        optional($.wordlayout_end),
        "}",
      ),

    rdldata_payload_line: (_) => token(prec(-1, /[^\r\n]+/)),
    wordlayout_payload_line: (_) => token(prec(-1, /[^\r\n]+/)),

    rdldata_end: (_) => token(prec(4, /END_OF_RDLDATA[ \t]*(?:\r?\n)?/)),
    wordlayout_end: (_) =>
      token(prec(4, /END_OF_WORDLAYOUT[ \t]*(?:\r?\n)?/)),

    code_section: ($) =>
      seq(
        keyword("CODE"),
        "{",
        repeat($.code_item),
        "}",
      ),

    unknown_section: ($) =>
      prec(
        -2,
        seq(field("name", $.section_name), "{", repeat($._unknown_item), "}"),
      ),

    _unknown_item: ($) =>
      choice(
        $.metadata_entry,
        $.unknown_section,
        $.unknown_text,
        ";",
      ),

    unknown_text: (_) => token(prec(-2, /[^\r\n{}]+/)),

    section_name: (_) => token(/[A-Z][A-Z0-9\-/ ]*/),

    code_item: ($) =>
      choice(
        $.attribute,
        $.var_section,
        $.procedure_declaration,
        $.event_declaration,
        $.begin_end_block,
        $.property_assignment,
        $.action_block_property,
        $.metadata_entry,
        $.unknown_text,
      ),

    section_item: ($) =>
      choice(
        $.property_assignment,
        $.action_block_property,
        $.metadata_entry,
        $.code_value,
        $.unknown_text,
      ),

    property_assignment: ($) =>
      choice(
        seq(
          field("name", $.property_name),
          "=",
          field("value", $.code_value),
        ),
        seq(
          field("name", $.property_name),
          "=",
          optional(field("value", $.metadata_value)),
          ";",
        ),
      ),

    property_name: (_) =>
      token(prec(-1, /[A-Za-z#][A-Za-z0-9_./:-]*( [A-Za-z0-9_./:-]+)*/)),

    assignment_value: ($) => choice($.code_value, $.metadata_value),

    action_block_property: ($) =>
      seq(
        field("name", $.property_name),
        "=",
        keyword("ACTIONS"),
        "{",
        repeat(
          choice(
            $.metadata_entry,
            $.metadata_property_assignment,
            $.code_value,
            $.metadata_value,
          ),
        ),
        "}",
      ),

    metadata_entry: ($) =>
      seq(
        "{",
        repeat(
          choice(
            field("header", $.entry_header_cell),
            $.metadata_property_assignment,
            $.action_block_property,
            $.metadata_entry,
            $.code_value,
            $.metadata_value,
            ";",
          ),
        ),
        "}",
      ),

    metadata_property_assignment: ($) =>
      prec.right(
        1,
        choice(
          seq(
            field("name", $.property_name),
            "=",
            field("value", $.code_value),
          ),
          seq(
            field("name", $.property_name),
            "=",
            optional(field("value", $.metadata_value)),
            optional(";"),
          ),
        ),
      ),

    entry_header_cell: (_) => token(/[^;={}\r\n][^;={}\r\n]*/),

    code_value: ($) => seq(optional($.var_section), $.begin_end_block),

    attribute: ($) =>
      seq(
        "[",
        field("name", $.identifier),
        optional(seq("(", optional($.metadata_value), ")")),
        "]",
      ),

    var_section: ($) => seq(keyword("VAR"), repeat1($.variable_declaration)),

    variable_declaration: ($) =>
      seq(
        field(
          "name",
          choice($.annotated_identifier, $.identifier, $.quoted_identifier),
        ),
        ":",
        field("type", $.type_spec),
        repeat(
          choice(
            keyword("INDATASET"),
            keyword("RUNONCLIENT"),
            keyword("WITHEVENTS"),
          ),
        ),
        ";",
      ),

    type_spec: ($) =>
      repeat1(
        choice(
          $.annotated_identifier,
          $.quoted_identifier,
          $.identifier,
          $.number_literal,
          $.string_literal,
          $.type_symbol,
          $.parenthesized_metadata,
          $.bracketed_metadata,
        ),
      ),

    type_symbol: (_) => token(/[.,:/_\-]+/),

    procedure_declaration: ($) =>
      seq(
        repeat($.attribute),
        optional(keyword("LOCAL")),
        keyword("PROCEDURE"),
        field("name", choice($.identifier, $.quoted_identifier)),
        optional(field("id_suffix", $.id_suffix)),
        optional(seq("(", optional($.parameter_list), ")")),
        optional(
          choice(
            seq(":", field("return_type", $.type_spec)),
            seq(
              field(
                "return_name",
                choice($.identifier, $.quoted_identifier, $.annotated_identifier),
              ),
              ":",
              field("return_type", $.type_spec),
            ),
          ),
        ),
        ";",
        optional($.var_section),
        field("body", $.begin_end_block),
      ),

    event_declaration: ($) =>
      seq(
        keyword("EVENT"),
        field(
          "publisher",
          choice($.identifier, $.quoted_identifier, $.annotated_identifier),
        ),
        "::",
        field("name", choice($.identifier, $.quoted_identifier)),
        optional(field("id_suffix", $.id_suffix)),
        optional(seq("(", optional($.parameter_list), ")")),
        ";",
        optional($.var_section),
        field("body", $.begin_end_block),
      ),

    parameter_list: ($) => seq($.parameter, repeat(seq(";", $.parameter))),

    parameter: ($) =>
      seq(
        optional(choice(keyword("VAR"), keyword("CONST"))),
        field("name", choice($.identifier, $.quoted_identifier)),
        optional(field("id_suffix", $.id_suffix)),
        ":",
        field("type", $.type_spec),
        repeat(choice(keyword("INDATASET"), keyword("RUNONCLIENT"))),
      ),

    begin_end_block: ($) =>
      prec.right(
        seq(
          keyword("BEGIN"),
          repeat($.statement),
          keyword("END"),
          optional(choice(";", ".")),
        ),
      ),

    statement: ($) =>
      choice(
        $.begin_end_block,
        $.if_statement,
        $.case_statement,
        $.repeat_until_statement,
        $.while_statement,
        $.for_statement,
        $.foreach_statement,
        $.with_statement,
        $.assignment_statement,
        $.exit_statement,
        $.call_statement,
        $.empty_statement,
        $.raw_statement,
        $.unknown_statement,
      ),

    empty_statement: (_) => ";",

    if_statement: ($) =>
      prec.right(
        seq(
          keyword("IF"),
          field("condition", $.expression),
          keyword("THEN"),
          field("consequence", $.statement_body),
          optional(seq(keyword("ELSE"), field("alternative", $.statement_body))),
        ),
      ),

    if_statement_no_else: ($) =>
      prec.right(
        seq(
          keyword("IF"),
          field("condition", $.expression),
          keyword("THEN"),
          field("consequence", $.statement_body_no_else),
        ),
      ),

    statement_body: ($) =>
      choice(
        $.begin_end_block,
        $.if_statement,
        $.case_statement,
        $.repeat_until_statement,
        $.while_statement,
        $.for_statement,
        $.foreach_statement,
        $.with_statement,
        $.assignment_statement,
        $.exit_statement,
        $.call_statement,
        $.empty_statement,
        $.raw_statement,
        $.unknown_statement,
      ),

    statement_body_no_else: ($) =>
      choice(
        $.begin_end_block,
        $.if_statement_no_else,
        $.case_statement,
        $.repeat_until_statement,
        $.while_statement,
        $.for_statement,
        $.foreach_statement,
        $.with_statement,
        $.assignment_statement,
        $.exit_statement,
        $.call_statement,
        $.empty_statement,
        $.raw_statement,
        $.unknown_statement,
      ),

    unknown_statement: ($) =>
      prec.right(-2, seq($.unknown_text, optional(";"))),

    case_statement: ($) =>
      prec.right(
        seq(
          keyword("CASE"),
          field("value", $.expression),
          keyword("OF"),
          repeat($.case_clause),
          optional(seq(keyword("ELSE"), repeat($.statement))),
          keyword("END"),
          optional(";"),
        ),
      ),

    case_clause: ($) => seq($.case_value_list, ":", $.statement_body_no_else),

    case_value_list: ($) => seq($.expression, repeat(seq(",", $.expression))),

    repeat_until_statement: ($) =>
      prec.right(
        seq(
          keyword("REPEAT"),
          repeat($.statement),
          keyword("UNTIL"),
          $.expression,
          optional(";"),
        ),
      ),

    while_statement: ($) =>
      seq(keyword("WHILE"), $.expression, keyword("DO"), $.statement_body),

    for_statement: ($) =>
      seq(
        keyword("FOR"),
        field("iterator", $.expression),
        ":=",
        $.expression,
        choice(keyword("TO"), keyword("DOWNTO")),
        $.expression,
        keyword("DO"),
        $.statement_body,
      ),

    foreach_statement: ($) =>
      seq(
        keyword("FOREACH"),
        field("iterator", $.expression),
        keyword("IN"),
        $.expression,
        keyword("DO"),
        $.statement_body,
      ),

    with_statement: ($) =>
      seq(keyword("WITH"), $.expression, keyword("DO"), $.statement_body),

    assignment_statement: ($) =>
      prec.right(
        2,
        seq(
          field("left", $.expression),
          ":=",
          field("right", $.expression),
          optional(";"),
        ),
      ),

    exit_statement: ($) =>
      prec.right(
        seq(
          keyword("EXIT"),
          optional(seq("(", optional($.expression), ")")),
          optional(";"),
        ),
      ),

    call_statement: ($) =>
      prec.right(1, seq($.expression, optional(";"))),

    raw_statement: ($) => prec.right(-1, seq($.metadata_value, optional(";"))),

    expression: ($) =>
      choice(
        $.binary_expression,
        $.unary_expression,
        $.call_expression,
        $.member_expression,
        $.scope_expression,
        $.index_expression,
        $.parenthesized_expression,
        $.set_literal,
        $.primary_expression,
      ),

    binary_expression: ($) =>
      choice(
        prec.left(
          PREC.LOGICAL,
          seq($.expression, choice(keyword("AND"), keyword("OR"), keyword("XOR")), $.expression),
        ),
        prec.left(
          PREC.COMPARE,
          seq(
            $.expression,
            choice("=", "<>", "<", "<=", ">", ">=", "..", keyword("IN")),
            $.expression,
          ),
        ),
        prec.left(PREC.ADD, seq($.expression, choice("+", "-"), $.expression)),
        prec.left(
          PREC.MULTIPLY,
          seq($.expression, choice("*", "/", keyword("DIV"), keyword("MOD")), $.expression),
        ),
      ),

    unary_expression: ($) =>
      prec.right(PREC.UNARY, seq(choice(keyword("NOT"), "+", "-"), $.expression)),

    member_expression: ($) =>
      prec.left(
        PREC.MEMBER,
        seq(
          field("object", $.expression),
          ".",
          field("property", choice($.identifier, $.quoted_identifier, $.annotated_identifier)),
        ),
      ),

    scope_expression: ($) =>
      prec.left(
        PREC.MEMBER,
        seq(
          field("scope", $.expression),
          "::",
          field("name", choice($.identifier, $.quoted_identifier, $.annotated_identifier)),
        ),
      ),

    call_expression: ($) =>
      prec.left(
        PREC.CALL,
        seq(field("function", $.expression), "(", optional($.argument_list), ")"),
      ),

    index_expression: ($) =>
      prec.left(
        PREC.CALL,
        seq(field("collection", $.expression), "[", optional($.argument_list), "]"),
      ),

    argument_list: ($) => seq($.expression, repeat(seq(",", $.expression))),

    parenthesized_expression: ($) => seq("(", $.expression, ")"),

    set_literal: ($) =>
      seq("[", optional(seq($.expression, repeat(seq(",", $.expression)))), "]"),

    primary_expression: ($) =>
      choice(
        $.annotated_identifier,
        $.quoted_identifier,
        $.identifier,
        $.string_literal,
        $.datetime_literal,
        $.date_literal,
        $.time_literal,
        $.number_literal,
        $.boolean_literal,
      ),

    metadata_value: ($) =>
      prec.right(seq($._metadata_part, repeat($._metadata_part))),

    _metadata_part: ($) =>
      choice(
        $.metadata_atom,
        $.metadata_braced_segment,
        $.annotated_identifier,
        $.quoted_identifier,
        $.identifier,
        $.string_literal,
        $.datetime_literal,
        $.date_literal,
        $.time_literal,
        $.number_literal,
        $.boolean_literal,
        $.parenthesized_metadata,
        $.bracketed_metadata,
        "::",
        ".",
        ",",
        ":",
        "+",
        "-",
        "*",
        "/",
        "|",
        "#",
        "&",
        "@",
        "?",
        "%",
        "<",
        ">",
        "<=",
        ">=",
        "<>",
        "=",
      ),

    metadata_braced_segment: (_) => token(/\{[^{}\r\n]*\}/),

    metadata_atom: (_) => token(prec(-1, /[^{}\[\]()=;,\r\n][^{}\[\]()=;,\r\n]*/)),

    parenthesized_metadata: ($) =>
      seq("(", repeat(choice($._metadata_part, ";")), ")"),

    bracketed_metadata: ($) =>
      seq("[", repeat(choice($._metadata_part, ";")), "]"),

    annotated_identifier: ($) => seq(choice($.identifier, $.quoted_identifier), $.id_suffix),

    id_suffix: (_) => token(/@-?[0-9]+/),

    quoted_identifier: (_) => token(/"([^"\r\n]|"")*"/),

    identifier: (_) => token(/[A-Za-z_][A-Za-z0-9_]*/),

    string_literal: (_) => token(/'([^'\r\n]|'')*'/),

    date_literal: (_) => token(/(?:0|[0-9]+)[Dd]/),

    time_literal: (_) => token(/(?:0|[0-9]+(?:\.[0-9]+)?)[Tt]/),

    datetime_literal: (_) => token(/(?:0|[0-9]+(?:\.[0-9]+)?)[Dd][Tt]/),

    number_literal: (_) => token(/[0-9]+(?:\.[0-9]+)?(?:[Ll])?/),

    boolean_literal: (_) => token(ciChoice(["TRUE", "FALSE", "YES", "NO"])),

    line_comment: (_) => token(/\/\/[^\r\n]*/),
  },
});

function ci(word) {
  let pattern = "";
  for (const char of word) {
    if (/[A-Za-z]/.test(char)) {
      pattern += `[${char.toLowerCase()}${char.toUpperCase()}]`;
    } else if (/[-/\\^$*+?.()|[\]{}]/.test(char)) {
      pattern += `\\${char}`;
    } else {
      pattern += char;
    }
  }
  return new RegExp(pattern);
}

function ciChoice(words) {
  return new RegExp(words.map((word) => `(?:${ci(word).source})`).join("|"));
}

function keyword(word) {
  return token(ci(word));
}
