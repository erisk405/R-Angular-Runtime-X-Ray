use swc_common::sync::Lrc;
use swc_common::{FileName, SourceMap};
use swc_ecma_ast::*;
use swc_ecma_parser::{Parser, StringInput, Syntax, TsSyntax};

pub struct TypeScriptParser {
    source_map: Lrc<SourceMap>,
}

impl TypeScriptParser {
    pub fn new() -> Self {
        Self {
            source_map: Lrc::new(SourceMap::default()),
        }
    }

    /// Find the line number where a method is defined in TypeScript code
    pub fn find_method_line(
        &self,
        file_content: &str,
        method_name: &str,
    ) -> Result<Option<u32>, String> {
        // Create a source file
        let source_file = self
            .source_map
            .new_source_file(Lrc::new(FileName::Anon), file_content.to_string());

        // Configure TypeScript parser
        let syntax = Syntax::Typescript(TsSyntax {
            tsx: true,
            decorators: true,
            ..Default::default()
        });

        // Create parser
        let input = StringInput::from(&*source_file);
        let mut parser = Parser::new(syntax, input, None);

        // Parse the file
        let module = parser
            .parse_module()
            .map_err(|e| format!("Parse error: {:?}", e))?;

        // Search for the method in the AST
        let line = self.find_method_in_module(&module, method_name);

        Ok(line)
    }

    /// Search for a method in the module's AST
    fn find_method_in_module(&self, module: &Module, method_name: &str) -> Option<u32> {
        for item in &module.body {
            if let ModuleItem::Stmt(stmt) = item {
                if let Some(line) = self.find_method_in_stmt(stmt, method_name) {
                    return Some(line);
                }
            } else if let ModuleItem::ModuleDecl(decl) = item {
                if let Some(line) = self.find_method_in_module_decl(decl, method_name) {
                    return Some(line);
                }
            }
        }
        None
    }

    /// Search for a method in a statement
    fn find_method_in_stmt(&self, stmt: &Stmt, method_name: &str) -> Option<u32> {
        match stmt {
            Stmt::Decl(Decl::Class(class_decl)) => {
                self.find_method_in_class(&class_decl.class, method_name)
            }
            _ => None,
        }
    }

    /// Search for a method in a module declaration
    fn find_method_in_module_decl(&self, decl: &ModuleDecl, method_name: &str) -> Option<u32> {
        match decl {
            ModuleDecl::ExportDecl(export_decl) => match &export_decl.decl {
                Decl::Class(class_decl) => {
                    self.find_method_in_class(&class_decl.class, method_name)
                }
                _ => None,
            },
            ModuleDecl::ExportDefaultDecl(export_default) => match &export_default.decl {
                DefaultDecl::Class(class_expr) => {
                    self.find_method_in_class(&class_expr.class, method_name)
                }
                _ => None,
            },
            _ => None,
        }
    }

    /// Search for a method in a class
    fn find_method_in_class(&self, class: &Class, method_name: &str) -> Option<u32> {
        for member in &class.body {
            match member {
                ClassMember::Method(method) => {
                    if self.matches_method_name(&method.key, method_name) {
                        // Get the line number from the span
                        let loc = self.source_map.lookup_line(method.span.lo);
                        if let Ok(loc) = loc {
                            // Line numbers are 0-indexed, so add 1 for human-readable line numbers
                            return Some(loc.line as u32 + 1);
                        }
                    }
                }
                ClassMember::PrivateMethod(method) => {
                    if method.key.name.as_str() == method_name {
                        let loc = self.source_map.lookup_line(method.span.lo);
                        if let Ok(loc) = loc {
                            return Some(loc.line as u32 + 1);
                        }
                    }
                }
                _ => {}
            }
        }
        None
    }

    /// Check if a property name matches the method name
    fn matches_method_name(&self, prop_name: &PropName, method_name: &str) -> bool {
        match prop_name {
            PropName::Ident(ident) => ident.sym.as_str() == method_name,
            PropName::Str(str_lit) => str_lit.value.as_str() == Some(method_name),
            _ => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_method_line() {
        let parser = TypeScriptParser::new();

        let code = r#"
export class MyComponent {
  constructor() {}

  ngOnInit() {
    console.log('init');
  }

  myMethod() {
    return 42;
  }
}
"#;

        let result = parser.find_method_line(code, "myMethod");
        assert!(result.is_ok());
        assert!(result.unwrap().is_some());

        let result = parser.find_method_line(code, "ngOnInit");
        assert!(result.is_ok());
        assert!(result.unwrap().is_some());
    }
}
